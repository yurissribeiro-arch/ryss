import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  addCustomerNote,
  deleteCustomer,
  setCustomerPassword,
  updateCustomer,
} from "../../crm-actions";
import { ActionForm } from "@/components/ActionForm";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { CustomerFields } from "@/components/admin/CustomerFields";
import { MessageComposer, ResetLinkButton, type Template } from "@/components/admin/CustomerTools";
import { btn, btnOutline, input } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/admin";
import { formatDateBr, maskCep, maskPhone } from "@/lib/br";
import { CUSTOMER_FIELDS, statsFor, type CustomerRow } from "@/lib/crm";
import { isUuid } from "@/lib/form";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Cliente" };

export default function CustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <CustomerDetail params={params} />
    </Suspense>
  );
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type TimelineItem = { id: string; at: string; kind: "note" | "whatsapp" | "email"; title?: string; body: string };

async function CustomerDetail({ params }: Pick<PageProps<"/admin/clientes/[id]">, "params">) {
  const { supabase, email } = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data: c } = await supabase
    .from("customers")
    .select(CUSTOMER_FIELDS)
    .eq("id", id)
    .maybeSingle<CustomerRow>();
  if (!c) notFound();

  const [orders, addresses, notes, messages, templates, stats] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, status, total_cents, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .returns<{ id: string; number: number; status: OrderStatus; total_cents: number; created_at: string }[]>(),
    supabase
      .from("customer_addresses")
      .select("id, label, cep, street, number, complement, district, city, state, is_default")
      .eq("customer_id", id)
      .order("is_default", { ascending: false })
      .returns<{ id: string; label: string; cep: string; street: string; number: string; complement: string; district: string; city: string; state: string; is_default: boolean }[]>(),
    supabase
      .from("customer_notes")
      .select("id, body, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<{ id: string; body: string; created_at: string }[]>(),
    supabase
      .from("customer_messages")
      .select("id, channel, subject, body, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<{ id: string; channel: "whatsapp" | "email"; subject: string; body: string; created_at: string }[]>(),
    supabase.from("message_templates").select("id, name, channel, subject, body").order("name").returns<Template[]>(),
    statsFor(supabase, [id]),
  ]);

  const s = stats.get(id);
  const ordersCount = s?.orders_count ?? 0;
  const spent = s?.total_spent_cents ?? 0;

  const timeline: TimelineItem[] = [
    ...(notes.data ?? []).map((n) => ({ id: n.id, at: n.created_at, kind: "note" as const, body: n.body })),
    ...(messages.data ?? []).map((m) => ({
      id: m.id,
      at: m.created_at,
      kind: m.channel,
      title: m.subject,
      body: m.body,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <AdminShell
      email={email}
      title={c.full_name}
      actions={
        <div className="flex gap-2">
          <a href={`https://wa.me/55${c.phone}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>
            WhatsApp ↗
          </a>
          <a href={`mailto:${c.email}`} className={btnOutline}>
            E-mail ↗
          </a>
        </div>
      }
    >
      <p className="-mt-3 mb-6 text-sm text-muted">
        Cliente desde {dateTime.format(new Date(c.created_at))}
        {c.birth_date && ` · Nascimento ${formatDateBr(c.birth_date)}`}
        {c.user_id ? " · Tem conta na loja" : " · Sem conta (comprou como visitante)"}
        {c.blocked && <span className="text-red-700"> · BLOQUEADO</span>}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Pedidos", String(ordersCount)],
              ["Total gasto", formatPrice(spent)],
              ["Ticket médio", formatPrice(ordersCount ? Math.round(spent / ordersCount) : 0)],
              ["Última compra", s?.last_order_at ? dateTime.format(new Date(s.last_order_at)).split(" ")[0] : "—"],
            ].map(([k, v]) => (
              <div key={k} className="border border-line bg-paper p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">{k}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.12em]">Dados do cadastro</h2>
            <ActionForm action={updateCustomer} submitLabel="Salvar dados" buttonClassName={btn} hidden={{ id: c.id }}>
              <CustomerFields value={c} />
            </ActionForm>
          </section>

          <section className="border border-line bg-paper">
            <h2 className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.12em]">
              Pedidos ({orders.data?.length ?? 0})
            </h2>
            {orders.data && orders.data.length > 0 ? (
              <ul className="divide-y divide-line">
                {orders.data.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/pedidos/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-mist">
                      <span>
                        #{o.number} <span className="text-muted">· {dateTime.format(new Date(o.created_at))}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-xs ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                        <span className="tabular-nums">{formatPrice(o.total_cents)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">Nenhum pedido.</p>
            )}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Endereços</h2>
            {addresses.data && addresses.data.length > 0 ? (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {addresses.data.map((a) => (
                  <li key={a.id} className="border border-line p-3 text-sm leading-relaxed">
                    <p className="font-medium">
                      {a.label || "Endereço"} {a.is_default && <span className="text-xs text-muted">(principal)</span>}
                    </p>
                    {a.street}, {a.number}
                    {a.complement && ` · ${a.complement}`}
                    <br />
                    {a.district} · {a.city}/{a.state} · CEP {maskCep(a.cep)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Nenhum endereço salvo na conta. Os endereços de entrega ficam em cada pedido.
              </p>
            )}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Histórico de atendimento</h2>
            <ActionForm
              action={addCustomerNote}
              submitLabel="Adicionar anotação"
              resetOnSuccess
              buttonClassName={btn}
              hidden={{ id: c.id }}
              className="mt-3 flex flex-col gap-3"
            >
              <textarea
                name="body"
                rows={3}
                maxLength={5000}
                placeholder="Ex.: Cliente pediu troca de tamanho; combinado envio na segunda."
                className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </ActionForm>
            {timeline.length > 0 && (
              <ol className="mt-5 flex flex-col gap-3">
                {timeline.map((t) => (
                  <li key={`${t.kind}-${t.id}`} className="border-l-2 border-line pl-3 text-sm">
                    <p className="text-xs text-muted">
                      {dateTime.format(new Date(t.at))} ·{" "}
                      {t.kind === "note" ? "Anotação" : t.kind === "whatsapp" ? "WhatsApp enviado" : "E-mail enviado"}
                      {t.title && ` · ${t.title}`}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{t.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="border border-line bg-paper p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Enviar mensagem</h2>
            <p className="mb-3 mt-1 text-xs text-muted">
              Para {maskPhone(c.phone)} / {c.email}. Modelos em Marketing → Modelos.
            </p>
            <MessageComposer
              customer={{ id: c.id, full_name: c.full_name, email: c.email, phone: c.phone }}
              templates={templates.data ?? []}
            />
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Acesso à conta</h2>
            <p className="mb-3 mt-1 text-xs text-muted">
              {c.user_id
                ? "Por segurança, senhas não podem ser vistas. Defina uma nova ou gere um link para o cliente criar a dele."
                : "O cliente ainda não tem conta. Defina uma senha para criar o acesso com o e-mail do cadastro."}
            </p>
            <ActionForm
              action={setCustomerPassword}
              submitLabel={c.user_id ? "Definir nova senha" : "Criar acesso"}
              resetOnSuccess
              buttonClassName={`${btn} w-full`}
              hidden={{ id: c.id }}
              className="flex flex-col gap-3"
            >
              <input
                name="password"
                type="text"
                autoComplete="off"
                minLength={8}
                placeholder="Nova senha (mín. 8 caracteres)"
                required
                className={`${input} w-full`}
              />
            </ActionForm>
            {c.user_id && (
              <div className="mt-4 border-t border-line pt-4">
                <ResetLinkButton customerId={c.id} />
              </div>
            )}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Excluir cliente</h2>
            <p className="mb-3 mt-1 text-xs text-muted">
              Somente clientes sem pedidos. Para impedir compras, use “Bloquear” nos dados do cadastro.
            </p>
            <ActionForm
              action={deleteCustomer}
              submitLabel="Excluir cliente"
              pendingLabel="Excluindo…"
              confirmText={`Excluir ${c.full_name} e a conta de acesso? Isso não pode ser desfeito.`}
              hidden={{ id: c.id }}
              buttonClassName="text-sm text-red-700 underline-offset-4 hover:underline disabled:opacity-50"
            >
              {null}
            </ActionForm>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
