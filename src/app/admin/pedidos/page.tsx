import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/admin";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Pedidos" };

const FILTERS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "", label: "Todos", statuses: null },
  { key: "aguardando_pagamento", label: "Aguardando pagamento", statuses: ["aguardando_pagamento"] },
  { key: "a_enviar", label: "A enviar", statuses: ["pago", "em_separacao"] },
  { key: "enviado", label: "Enviados", statuses: ["enviado"] },
  { key: "entregue", label: "Entregues", statuses: ["entregue"] },
  { key: "cancelado", label: "Cancelados", statuses: ["cancelado"] },
];


export default function OrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderList searchParams={searchParams} />
    </Suspense>
  );
}

type Row = {
  id: string;
  number: number;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  customers: { full_name: string } | null;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

async function OrderList({ searchParams }: Pick<PageProps<"/admin/pedidos">, "searchParams">) {
  const { supabase, email } = await requireAdmin();
  const { status, q } = await searchParams;
  const search = typeof q === "string" ? q.replace(/[^\p{L}\p{N} ]/gu, " ").trim().slice(0, 60) : "";
  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];

  let query = supabase
    .from("orders")
    .select("id, number, status, total_cents, created_at, customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter.statuses) query = query.in("status", filter.statuses);
  if (/^\d+$/.test(search)) {
    query = query.eq("number", Number(search));
  } else if (search) {
    const { data: found } = await supabase
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(200)
      .returns<{ id: string }[]>();
    query = query.in("customer_id", (found ?? []).map((c) => c.id));
  }
  const { data, error } = await query.returns<Row[]>();

  return (
    <AdminShell email={email} title="Pedidos">
      <form className="mb-3 flex max-w-md gap-2">
        {filter.key && <input type="hidden" name="status" value={filter.key} />}
        <input
          name="q"
          defaultValue={search}
          placeholder="Nº do pedido ou nome/e-mail do cliente"
          className="h-10 w-full border border-line bg-paper px-3 text-sm outline-none focus:border-ink"
        />
        <button type="submit" className="h-10 bg-ink px-4 text-sm text-paper">
          Buscar
        </button>
      </form>
      <nav aria-label="Filtrar pedidos" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/pedidos?status=${f.key}` : "/admin/pedidos"}
            aria-current={f.key === filter.key ? "page" : undefined}
            className={`border px-3 py-1.5 text-xs ${
              f.key === filter.key
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper hover:border-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error && <p className="text-sm text-red-700">Erro ao carregar: {error.message}</p>}
      {data && data.length === 0 && (
        <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
          Nenhum pedido {filter.statuses ? "nesta situação" : "ainda"}.
        </p>
      )}
      {data && data.length > 0 && (
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nº</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((o) => (
                <tr key={o.id} className="hover:bg-mist">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{dateFmt.format(new Date(o.created_at))}</td>
                  <td className="px-4 py-3">{o.customers?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs ${STATUS_STYLE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
