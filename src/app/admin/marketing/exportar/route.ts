import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { toCsv } from "@/lib/crm";
import { findAudience, readSegment } from "@/lib/segments";

/** Contatos do público de marketing (somente quem autorizou). */
export async function GET(request: NextRequest) {
  const { supabase } = await requireAdmin();
  const filters = readSegment(Object.fromEntries(request.nextUrl.searchParams));
  const { audience, stats } = await findAudience(supabase, filters);

  const csv = toCsv([
    ["Nome", "Primeiro nome", "E-mail", "WhatsApp", "Etiquetas", "Pedidos", "Total gasto (R$)"],
    ...audience.map((c) => {
      const s = stats.get(c.id);
      return [
        c.full_name,
        c.full_name.split(" ")[0],
        c.email,
        `55${c.phone}`,
        c.tags.join(", "),
        s?.orders_count ?? 0,
        ((s?.total_spent_cents ?? 0) / 100).toFixed(2).replace(".", ","),
      ];
    }),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="publico-marketing.csv"',
      "Cache-Control": "no-store",
    },
  });
}
