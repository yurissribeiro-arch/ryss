import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountShell, AccountSkeleton } from "@/components/conta/AccountShell";
import { STATUS_LABEL, type OrderStatus } from "@/lib/admin";
import { requireCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false },
};

export default function AccountPage({ searchParams }: PageProps<"/conta">) {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

type Row = {
  id: string;
  number: number;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  tracking_code: string;
  order_items: { quantity: number }[];
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Sao_Paulo",
});

async function Orders({ searchParams }: Pick<PageProps<"/conta">, "searchParams">) {
  const { customer, db } = await requireCustomer("/conta");
  const { senha } = await searchParams;

  const { data: orders } = await db
    .from("orders")
    .select("id, number, status, total_cents, created_at, tracking_code, order_items(quantity)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Row[]>();

  return (
    <AccountShell title={`Olá, ${customer.full_name.split(" ")[0]}`} active="/conta">
      {senha === "alterada" && (
        <p role="status" className="mb-6 border border-line px-4 py-3 text-sm">
          Senha alterada com sucesso.
        </p>
      )}
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">Meus pedidos</h2>
      {!orders || orders.length === 0 ? (
        <div className="mt-6 border border-line px-4 py-10 text-center">
          <p className="text-sm text-muted">Você ainda não fez pedidos.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-12 items-center bg-ink px-8 text-sm font-medium uppercase tracking-[0.2em] text-paper hover:opacity-85"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {orders.map((o) => {
            const items = o.order_items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li key={o.id}>
                <Link
                  href={`/pedido/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm hover:bg-mist/60"
                >
                  <div>
                    <p className="font-medium">Pedido nº {o.number}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {dateFmt.format(new Date(o.created_at))} · {items}{" "}
                      {items === 1 ? "item" : "itens"}
                      {o.tracking_code && ` · Rastreio: ${o.tracking_code}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{formatPrice(o.total_cents)}</p>
                    <p className="mt-0.5 text-xs text-muted">{STATUS_LABEL[o.status]}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
