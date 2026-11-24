import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Pedido recebido",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OrderPage({ params }: PageProps<"/pedido/[id]">) {
  return (
    <div className="mx-auto max-w-[720px] px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
      <Suspense fallback={<div className="h-80 animate-pulse bg-mist" aria-hidden />}>
        <OrderDetails params={params} />
      </Suspense>
    </div>
  );
}

type OrderRow = {
  number: number;
  status: string;
  payment_method: PaymentMethod | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  created_at: string;
  shipping_address: { recipient?: string };
  shipping_carrier: string;
  tracking_code: string;
  order_items: {
    id: string;
    product_name: string;
    size: string;
    unit_price_cents: number;
    quantity: number;
  }[];
};

async function OrderDetails({ params }: Pick<PageProps<"/pedido/[id]">, "params">) {
  await connection();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = createAdminClient();
  if (!supabase) notFound();

  // O endereço completo e o CPF não são exibidos: o link pode ser compartilhado.
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "number, status, payment_method, subtotal_cents, shipping_cents, total_cents, created_at, shipping_address, shipping_carrier, tracking_code, order_items(id, product_name, size, unit_price_cents, quantity)",
    )
    .eq("id", id)
    .maybeSingle<OrderRow>();

  if (error) throw new Error(`Falha ao carregar pedido: ${error.message}`);
  if (!order) notFound();

  const firstName = order.shipping_address.recipient?.split(" ")[0];
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(order.created_at));

  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">
        Pedido nº {order.number}
      </p>
      <h1 className="mt-3 text-lg font-semibold uppercase tracking-[0.12em] md:text-2xl">
        {firstName ? `Obrigado, ${firstName}!` : "Pedido recebido"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Seu pedido foi registrado em {date}. Guarde o número do pedido.
      </p>

      <dl className="mt-8 grid gap-4 border-y border-line py-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.15em] text-muted">Situação</dt>
          <dd className="mt-1 font-medium">
            {STATUS_LABEL[order.status] ?? order.status}
          </dd>
        </div>
        {order.payment_method && (
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-muted">
              Forma de pagamento escolhida
            </dt>
            <dd className="mt-1 font-medium">{PAYMENT_METHODS[order.payment_method]}</dd>
          </div>
        )}
        {order.tracking_code && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.15em] text-muted">
              Código de rastreio{order.shipping_carrier && ` (${order.shipping_carrier})`}
            </dt>
            <dd className="mt-1 font-medium tracking-wider">{order.tracking_code}</dd>
          </div>
        )}
      </dl>

      {order.status === "aguardando_pagamento" && (
        <p className="mt-5 border border-line px-4 py-3 text-xs leading-relaxed text-muted">
          O pagamento online ainda não está disponível e nenhum valor foi cobrado.
        </p>
      )}

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em]">Itens</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-4 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium uppercase tracking-[0.1em]">
                {item.product_name}
              </p>
              <p className="mt-1 text-xs text-muted">
                Tamanho {item.size} · {item.quantity} ×{" "}
                {formatPrice(item.unit_price_cents)}
              </p>
            </div>
            <p className="tabular-nums">
              {formatPrice(item.unit_price_cents * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-5 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(order.subtotal_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Frete</dt>
          <dd className="text-muted">
            {order.shipping_cents > 0 ? formatPrice(order.shipping_cents) : "Não calculado"}
          </dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
          <dt className="uppercase tracking-[0.2em]">Total</dt>
          <dd className="text-lg tabular-nums">{formatPrice(order.total_cents)}</dd>
        </div>
      </dl>

      <Link
        href="/"
        className="mt-10 flex h-12 items-center justify-center bg-ink text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85"
      >
        Voltar para a loja
      </Link>
    </>
  );
}
