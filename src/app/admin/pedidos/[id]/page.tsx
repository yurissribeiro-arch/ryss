import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { ActionForm } from "@/components/ActionForm";
import { btn, input, label } from "@/components/admin/styles";
import { updateOrderShipping } from "../../crm-actions";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/admin";
import { maskCep, maskCpf, maskPhone } from "@/lib/br";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Pedido" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

type Address = {
  recipient?: string;
  email?: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
};

type Row = {
  id: string;
  number: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
  shipping_address: Address;
  shipping_carrier: string;
  tracking_code: string;
  internal_notes: string;
  customer_id: string;
  customers: { full_name: string; cpf: string; email: string; phone: string } | null;
  order_items: {
    id: string;
    product_id: string | null;
    product_name: string;
    size: string;
    unit_price_cents: number;
    quantity: number;
  }[];
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

async function OrderDetail({ params }: Pick<PageProps<"/admin/pedidos/[id]">, "params">) {
  const { supabase, email } = await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: o, error } = await supabase
    .from("orders")
    .select(
      "id, number, status, payment_method, subtotal_cents, shipping_cents, total_cents, created_at, updated_at, shipping_address, shipping_carrier, tracking_code, internal_notes, customer_id, customers(full_name, cpf, email, phone), order_items(id, product_id, product_name, size, unit_price_cents, quantity)",
    )
    .eq("id", id)
    .maybeSingle<Row>();

  if (error) throw new Error(error.message);
  if (!o) notFound();

  const a = o.shipping_address;
  // Dados gravados no momento da compra têm prioridade sobre o cadastro atual.
  const name = a.recipient ?? o.customers?.full_name ?? "—";
  const phone = a.phone ?? o.customers?.phone ?? "";
  const mail = a.email ?? o.customers?.email ?? "";
  const whatsapp = phone ? `https://wa.me/55${phone}` : null;

  return (
    <AdminShell
      email={email}
      title={`Pedido #${o.number}`}
      actions={
        <span className={`px-2.5 py-1 text-xs ${STATUS_STYLE[o.status]}`}>
          {STATUS_LABEL[o.status]}
        </span>
      }
    >
      <p className="-mt-3 mb-6 text-sm text-muted">
        Feito em {dateFmt.format(new Date(o.created_at))}
        {o.payment_method && ` · Pagamento escolhido: ${PAYMENT_METHODS[o.payment_method]}`}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section className="border border-line bg-paper">
            <h2 className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.12em]">
              Itens
            </h2>
            <ul className="divide-y divide-line">
              {o.order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted">
                      Tamanho {item.size} · {item.quantity} × {formatPrice(item.unit_price_cents)}
                    </p>
                  </div>
                  <p className="tabular-nums">
                    {formatPrice(item.unit_price_cents * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="border-t border-line px-5 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(o.subtotal_cents)}</dd>
              </div>
              <div className="mt-1 flex justify-between">
                <dt className="text-muted">Frete</dt>
                <dd className="tabular-nums">
                  {o.shipping_cents > 0 ? formatPrice(o.shipping_cents) : "Não calculado"}
                </dd>
              </div>
              <div className="mt-2 flex justify-between font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(o.total_cents)}</dd>
              </div>
            </dl>
          </section>

          <section className="border border-line bg-paper px-5 py-4 text-sm">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Entrega</h2>
            <address className="mt-3 not-italic leading-relaxed">
              {name}
              <br />
              {a.street}, {a.number}
              {a.complement ? ` · ${a.complement}` : ""}
              <br />
              {a.district} · {a.city}/{a.state}
              <br />
              CEP {a.cep ? maskCep(a.cep) : "—"}
            </address>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="border border-line bg-paper px-5 py-4 text-sm">
            <h2 className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em]">
              Cliente
              <Link href={`/admin/clientes/${o.customer_id}`} className="normal-case tracking-normal underline underline-offset-4">
                Ver ficha
              </Link>
            </h2>
            <dl className="mt-3 flex flex-col gap-2">
              <div>
                <dt className="text-xs text-muted">Nome</dt>
                <dd>{name}</dd>
              </div>
              {o.customers?.cpf && (
                <div>
                  <dt className="text-xs text-muted">CPF</dt>
                  <dd>{maskCpf(o.customers.cpf)}</dd>
                </div>
              )}
              {mail && (
                <div>
                  <dt className="text-xs text-muted">E-mail</dt>
                  <dd>
                    <a href={`mailto:${mail}`} className="underline underline-offset-4">
                      {mail}
                    </a>
                  </dd>
                </div>
              )}
              {phone && (
                <div>
                  <dt className="text-xs text-muted">Telefone</dt>
                  <dd>
                    {maskPhone(phone)}
                    {whatsapp && (
                      <>
                        {" · "}
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <OrderStatusForm orderId={o.id} status={o.status} />

          <section className="border border-line bg-paper px-5 py-4 text-sm">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.12em]">Entrega e anotações</h2>
            <ActionForm
              action={updateOrderShipping}
              submitLabel="Salvar"
              buttonClassName={`${btn} w-full`}
              hidden={{ id: o.id }}
              className="flex flex-col gap-3"
            >
              <label className={label}>
                Frete (R$)
                <input
                  name="shipping"
                  inputMode="decimal"
                  placeholder="0,00"
                  defaultValue={o.shipping_cents ? (o.shipping_cents / 100).toFixed(2).replace(".", ",") : ""}
                  className={`${input} w-full`}
                />
              </label>
              <label className={label}>
                Transportadora
                <input name="carrier" defaultValue={o.shipping_carrier} maxLength={60} placeholder="Correios, Jadlog…" className={`${input} w-full`} />
              </label>
              <label className={label}>
                Código de rastreio
                <input name="tracking" defaultValue={o.tracking_code} maxLength={60} className={`${input} w-full`} />
              </label>
              <label className={label}>
                Anotações internas (o cliente não vê)
                <textarea
                  name="notes"
                  defaultValue={o.internal_notes}
                  rows={3}
                  maxLength={5000}
                  className="w-full border border-line px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
                />
              </label>
              <p className="text-xs text-muted">
                O frete é somado ao total do pedido. O rastreio aparece para o cliente na página do pedido.
              </p>
            </ActionForm>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
