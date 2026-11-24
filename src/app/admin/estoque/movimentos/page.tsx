import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { btnOutline } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Movimentos de estoque" };

const REASON: Record<string, string> = {
  entrada: "Entrada",
  ajuste: "Ajuste",
  venda: "Venda",
  cancelamento: "Cancelamento (volta ao estoque)",
  devolucao: "Devolução",
  perda: "Perda / avaria",
};

export default function MovementsPage({ searchParams }: PageProps<"/admin/estoque/movimentos">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Movements searchParams={searchParams} />
    </Suspense>
  );
}

type Row = {
  id: string;
  product_name: string;
  size: string;
  delta: number;
  stock_after: number;
  reason: string;
  note: string;
  order_id: string | null;
  created_at: string;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

async function Movements({ searchParams }: Pick<PageProps<"/admin/estoque/movimentos">, "searchParams">) {
  const { supabase, email } = await requireAdmin();
  const { motivo } = await searchParams;

  let query = supabase
    .from("stock_movements")
    .select("id, product_name, size, delta, stock_after, reason, note, order_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (typeof motivo === "string" && motivo in REASON) query = query.eq("reason", motivo);
  const { data, error } = await query.returns<Row[]>();

  return (
    <AdminShell
      email={email}
      title="Movimentos de estoque"
      actions={
        <Link href="/admin/estoque" className={btnOutline}>
          ← Estoque
        </Link>
      }
    >
      <nav aria-label="Filtrar" className="mb-4 flex flex-wrap gap-2">
        {[["", "Todos"], ...Object.entries(REASON)].map(([key, label]) => (
          <Link
            key={key}
            href={key ? `/admin/estoque/movimentos?motivo=${key}` : "/admin/estoque/movimentos"}
            className={`border px-3 py-1.5 text-xs ${
              (motivo ?? "") === key ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error && <p className="text-sm text-red-700">Erro ao carregar: {error.message}</p>}
      {data && data.length === 0 && (
        <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
          Nenhum movimento registrado.
        </p>
      )}
      {data && data.length > 0 && (
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 text-right font-medium">Qtd.</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-muted">{dateTime.format(new Date(m.created_at))}</td>
                  <td className="px-4 py-3">
                    {m.product_name} <span className="text-muted">· {m.size}</span>
                  </td>
                  <td className="px-4 py-3">
                    {REASON[m.reason] ?? m.reason}
                    {m.order_id && (
                      <>
                        {" · "}
                        <Link href={`/admin/pedidos/${m.order_id}`} className="underline underline-offset-4">
                          pedido
                        </Link>
                      </>
                    )}
                    {m.note && <p className="text-xs text-muted">{m.note}</p>}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${m.delta < 0 ? "text-red-700" : "text-green-700"}`}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{m.stock_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
