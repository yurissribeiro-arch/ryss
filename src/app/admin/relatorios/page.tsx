import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Relatórios" };

const PERIODS = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "365", label: "12 meses" },
  { key: "mes", label: "Este mês" },
] as const;

export default function ReportsPage({ searchParams }: PageProps<"/admin/relatorios">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

type Summary = {
  orders_count: number;
  paid_count: number;
  revenue_cents: number;
  paid_revenue_cents: number;
  items_count: number;
  new_customers: number;
};

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

async function Reports({ searchParams }: Pick<PageProps<"/admin/relatorios">, "searchParams">) {
  const { supabase, email } = await requireAdmin();
  const { periodo } = await searchParams;
  const period = PERIODS.find((p) => p.key === periodo) ?? PERIODS[1];

  const now = new Date();
  let from: Date;
  if (period.key === "mes") {
    // Início do mês no horário de Brasília (UTC-3).
    const sp = new Date(now.getTime() - 3 * 3600_000);
    from = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 1, 3));
  } else {
    from = new Date(now.getTime() - Number(period.key) * 86_400_000);
  }
  const range = { p_from: from.toISOString(), p_to: now.toISOString() };

  const [summary, byDay, top, topCustomers] = await Promise.all([
    supabase.rpc("admin_sales_summary", range).single<Summary>(),
    supabase.rpc("admin_sales_by_day", range),
    supabase.rpc("admin_top_products", { ...range, p_limit: 15 }),
    supabase
      .from("customer_stats")
      .select("customer_id, orders_count, total_spent_cents")
      .gt("orders_count", 0)
      .order("total_spent_cents", { ascending: false })
      .limit(10)
      .returns<{ customer_id: string; orders_count: number; total_spent_cents: number }[]>(),
  ]);

  const s = summary.data;
  const ticket = s && s.orders_count ? Math.round(s.revenue_cents / s.orders_count) : 0;
  const days = (byDay.data ?? []) as { day: string; orders_count: number; revenue_cents: number }[];
  const topProducts = (top.data ?? []) as {
    product_name: string;
    size: string;
    quantity: number;
    revenue_cents: number;
  }[];
  const maxDay = Math.max(1, ...days.map((d) => d.revenue_cents));

  const ids = (topCustomers.data ?? []).map((c) => c.customer_id);
  const { data: names } = ids.length
    ? await supabase.from("customers").select("id, full_name").in("id", ids).returns<{ id: string; full_name: string }[]>()
    : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.id, n.full_name]));

  return (
    <AdminShell email={email} title="Relatórios">
      <nav aria-label="Período" className="mb-5 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/relatorios?periodo=${p.key}`}
            className={`border px-3 py-1.5 text-xs ${
              p.key === period.key ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {summary.error && <p className="mb-4 text-sm text-red-700">Erro ao carregar: {summary.error.message}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          ["Pedidos (sem cancelados)", String(s?.orders_count ?? 0)],
          ["Valor dos pedidos", formatPrice(s?.revenue_cents ?? 0)],
          ["Recebido (pagos)", formatPrice(s?.paid_revenue_cents ?? 0)],
          ["Ticket médio", formatPrice(ticket)],
          ["Peças vendidas", String(s?.items_count ?? 0)],
          ["Clientes novos", String(s?.new_customers ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="border border-line bg-paper p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">{k}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 border border-line bg-paper p-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Vendas por dia</h2>
        {days.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sem vendas no período.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-1.5">
            {days.map((d) => (
              <li key={d.day} className="grid grid-cols-[56px_minmax(0,1fr)_120px] items-center gap-3 text-xs">
                <span className="text-muted tabular-nums">{dayFmt.format(new Date(`${d.day}T00:00:00Z`))}</span>
                <span className="h-4 bg-mist">
                  <span
                    className="block h-full bg-ink"
                    style={{ width: `${Math.max(2, (d.revenue_cents / maxDay) * 100)}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  {formatPrice(d.revenue_cents)} · {d.orders_count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-paper">
          <h2 className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.12em]">
            Mais vendidos (produto e tamanho)
          </h2>
          {topProducts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Sem vendas no período.</p>
          ) : (
            <ol className="divide-y divide-line">
              {topProducts.map((t, i) => (
                <li key={`${t.product_name}-${t.size}`} className="flex justify-between gap-3 px-5 py-2.5 text-sm">
                  <span>
                    <span className="text-muted">{i + 1}.</span> {t.product_name}{" "}
                    <span className="text-muted">· {t.size}</span>
                  </span>
                  <span className="tabular-nums">
                    {t.quantity} un. · {formatPrice(t.revenue_cents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="border border-line bg-paper">
          <h2 className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.12em]">
            Melhores clientes (todo o período)
          </h2>
          {(topCustomers.data ?? []).length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">Nenhuma compra ainda.</p>
          ) : (
            <ol className="divide-y divide-line">
              {(topCustomers.data ?? []).map((c, i) => (
                <li key={c.customer_id}>
                  <Link
                    href={`/admin/clientes/${c.customer_id}`}
                    className="flex justify-between gap-3 px-5 py-2.5 text-sm hover:bg-mist"
                  >
                    <span>
                      <span className="text-muted">{i + 1}.</span> {nameOf.get(c.customer_id) ?? "Cliente"}
                    </span>
                    <span className="tabular-nums">
                      {c.orders_count} ped. · {formatPrice(c.total_spent_cents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
