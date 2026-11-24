import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { AudienceList } from "@/components/admin/AudienceList";
import type { Template } from "@/components/admin/CustomerTools";
import { btn, btnOutline, input } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";
import { findAudience, readSegment } from "@/lib/segments";

export const metadata: Metadata = { title: "Marketing" };

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function MarketingPage({ searchParams }: PageProps<"/admin/marketing">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Marketing searchParams={searchParams} />
    </Suspense>
  );
}

async function Marketing({ searchParams }: Pick<PageProps<"/admin/marketing">, "searchParams">) {
  const { supabase, email } = await requireAdmin();
  const f = readSegment(await searchParams);
  const { audience } = await findAudience(supabase, f);
  const { data: templates } = await supabase
    .from("message_templates")
    .select("id, name, channel, subject, body")
    .order("name")
    .returns<Template[]>();

  const query = new URLSearchParams(
    Object.entries(f).filter((e): e is [string, string] => !!e[1]),
  );

  return (
    <AdminShell
      email={email}
      title="Marketing"
      actions={
        <Link href="/admin/marketing/modelos" className={btnOutline}>
          Modelos de mensagem
        </Link>
      }
    >
      <p className="-mt-3 mb-5 max-w-3xl text-sm text-muted">
        Monte um público e envie mensagens. Por lei (LGPD), aparecem aqui somente clientes que
        autorizaram receber marketing. O envio automático em massa (e-mail ou WhatsApp) depende de
        integrar um serviço de envio; por enquanto, envie um a um ou exporte a lista.
      </p>

      <form className="mb-5 grid gap-2 border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <select name="compras" defaultValue={f.compras ?? ""} className={`${input} w-full`} aria-label="Compras">
          <option value="">Compras: todos</option>
          <option value="compradores">Já compraram</option>
          <option value="nunca_compraram">Nunca compraram</option>
        </select>
        <select name="inativos" defaultValue={f.inativos ?? ""} className={`${input} w-full`} aria-label="Sem comprar há">
          <option value="">Última compra: qualquer</option>
          <option value="30">Sem comprar há 30+ dias</option>
          <option value="60">Sem comprar há 60+ dias</option>
          <option value="90">Sem comprar há 90+ dias</option>
          <option value="180">Sem comprar há 180+ dias</option>
        </select>
        <input name="gasto" defaultValue={f.gasto} placeholder="Gastou no mínimo (R$)" inputMode="decimal" className={`${input} w-full`} />
        <select name="aniversario" defaultValue={f.aniversario ?? ""} className={`${input} w-full`} aria-label="Aniversário">
          <option value="">Aniversário: todos</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              Aniversariantes de {m}
            </option>
          ))}
        </select>
        <input name="tag" defaultValue={f.tag} placeholder="Etiqueta" className={`${input} w-full`} />
        <button type="submit" className={btn}>
          Filtrar
        </button>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {audience.length} {audience.length === 1 ? "cliente" : "clientes"} no público
        </p>
        {audience.length > 0 && (
          <a href={`/admin/marketing/exportar?${query}`} className={btnOutline}>
            Exportar contatos (planilha)
          </a>
        )}
      </div>

      <AudienceList
        customers={audience.slice(0, 500).map((c) => ({
          id: c.id,
          full_name: c.full_name,
          email: c.email,
          phone: c.phone,
        }))}
        total={audience.length}
        templates={templates ?? []}
      />
    </AdminShell>
  );
}
