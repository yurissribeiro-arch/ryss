import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { deleteTemplate, saveTemplate } from "../../crm-actions";
import { ActionForm } from "@/components/ActionForm";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import type { Template } from "@/components/admin/CustomerTools";
import { btn, btnOutline, input, label } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Modelos de mensagem" };

export default function TemplatesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Templates />
    </Suspense>
  );
}

function TemplateFields({ t }: { t?: Template }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Nome do modelo
          <input name="name" defaultValue={t?.name} required maxLength={80} className={`${input} w-full`} />
        </label>
        <label className={label}>
          Canal
          <select name="channel" defaultValue={t?.channel ?? "whatsapp"} className={`${input} w-full`}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </select>
        </label>
      </div>
      <label className={label}>
        Assunto (somente e-mail)
        <input name="subject" defaultValue={t?.subject} maxLength={200} className={`${input} w-full`} />
      </label>
      <label className={label}>
        Mensagem
        <textarea
          name="body"
          defaultValue={t?.body}
          required
          rows={5}
          maxLength={5000}
          className="w-full border border-line px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
        />
      </label>
    </>
  );
}

async function Templates() {
  const { supabase, email } = await requireAdmin();
  const { data } = await supabase
    .from("message_templates")
    .select("id, name, channel, subject, body")
    .order("name")
    .returns<Template[]>();

  return (
    <AdminShell
      email={email}
      title="Modelos de mensagem"
      actions={
        <Link href="/admin/marketing" className={btnOutline}>
          ← Marketing
        </Link>
      }
    >
      <p className="-mt-3 mb-5 text-sm text-muted">
        Use <code className="bg-mist px-1">{"{primeiro_nome}"}</code> ou{" "}
        <code className="bg-mist px-1">{"{nome}"}</code> para personalizar com o nome do cliente.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-paper p-5">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.12em]">Novo modelo</h2>
          <ActionForm action={saveTemplate} submitLabel="Criar modelo" resetOnSuccess buttonClassName={btn}>
            <TemplateFields />
          </ActionForm>
        </section>
        <div className="flex flex-col gap-4">
          {(data ?? []).length === 0 && (
            <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
              Nenhum modelo ainda.
            </p>
          )}
          {(data ?? []).map((t) => (
            <details key={t.id} className="border border-line bg-paper p-5">
              <summary className="cursor-pointer text-sm font-medium">
                {t.name}{" "}
                <span className="text-xs font-normal text-muted">
                  · {t.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                </span>
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                <ActionForm action={saveTemplate} submitLabel="Salvar" buttonClassName={btn} hidden={{ id: t.id }}>
                  <TemplateFields t={t} />
                </ActionForm>
                <ActionForm
                  action={deleteTemplate}
                  submitLabel="Excluir modelo"
                  confirmText={`Excluir o modelo "${t.name}"?`}
                  hidden={{ id: t.id }}
                  buttonClassName="text-sm text-red-700 underline-offset-4 hover:underline"
                >
                  {null}
                </ActionForm>
              </div>
            </details>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
