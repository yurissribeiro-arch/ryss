import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDateBr } from "@/lib/br";
import { findCustomers, readFilters, statsFor, toCsv } from "@/lib/crm";

/** Planilha (CSV) dos clientes filtrados. Somente administradores. */
export async function GET(request: NextRequest) {
  const { supabase } = await requireAdmin();
  const filters = readFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { rows } = await findCustomers(supabase, filters, { limit: 5000 });
  const stats = await statsFor(supabase, rows.map((r) => r.id));

  const csv = toCsv([
    [
      "Nome", "CPF", "E-mail", "Telefone", "Nascimento", "Aceita marketing",
      "Com conta", "Etiquetas", "Pedidos", "Total gasto (R$)", "Última compra", "Cadastro",
    ],
    ...rows.map((c) => {
      const s = stats.get(c.id);
      return [
        c.full_name,
        c.cpf,
        c.email,
        c.phone,
        formatDateBr(c.birth_date),
        c.marketing_opt_in ? "sim" : "não",
        c.user_id ? "sim" : "não",
        c.tags.join(", "),
        s?.orders_count ?? 0,
        ((s?.total_spent_cents ?? 0) / 100).toFixed(2).replace(".", ","),
        s?.last_order_at ? s.last_order_at.slice(0, 10) : "",
        c.created_at.slice(0, 10),
      ];
    }),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clientes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
