import type { Metadata } from "next";
import { Suspense } from "react";
import { addAdmin, removeAdmin } from "../crm-actions";
import { ActionForm } from "@/components/ActionForm";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { btn, input, label } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Equipe" };

export default function TeamPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  const { supabase, email } = await requireAdmin();
  const db = createAdminClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  const { data: admins } = await supabase
    .from("admins")
    .select("user_id, created_at")
    .order("created_at")
    .returns<{ user_id: string; created_at: string }[]>();

  const members = await Promise.all(
    (admins ?? []).map(async (a) => {
      const { data } = (await db?.auth.admin.getUserById(a.user_id)) ?? { data: null };
      return {
        id: a.user_id,
        email: data?.user?.email ?? "(usuário removido)",
        lastSignIn: data?.user?.last_sign_in_at ?? null,
      };
    }),
  );

  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <AdminShell email={email} title="Equipe">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="border border-line bg-paper">
          <h2 className="border-b border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.12em]">
            Pessoas com acesso ao painel
          </h2>
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {m.email} {m.id === me?.id && <span className="text-xs text-muted">(você)</span>}
                  </p>
                  <p className="text-xs text-muted">
                    Último acesso: {m.lastSignIn ? dateTime.format(new Date(m.lastSignIn)) : "nunca"}
                  </p>
                </div>
                {m.id !== me?.id && (
                  <ActionForm
                    action={removeAdmin}
                    submitLabel="Remover acesso"
                    confirmText={`Remover o acesso de ${m.email} ao painel?`}
                    hidden={{ userId: m.id }}
                    buttonClassName="text-xs text-red-700 underline-offset-4 hover:underline"
                  >
                    {null}
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-line bg-paper p-5">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.12em]">Adicionar pessoa</h2>
          <ActionForm action={addAdmin} submitLabel="Dar acesso ao painel" resetOnSuccess buttonClassName={btn}>
            <label className={label}>
              E-mail
              <input name="email" type="email" required className={`${input} w-full`} />
            </label>
            <label className={label}>
              Senha inicial (se a pessoa ainda não tiver usuário)
              <input name="password" type="text" autoComplete="off" minLength={8} className={`${input} w-full`} />
            </label>
            <p className="text-xs text-muted">
              Quem tem acesso ao painel vê pedidos e dados de clientes. Dê acesso somente a pessoas de
              confiança.
            </p>
          </ActionForm>
        </section>
      </div>
    </AdminShell>
  );
}
