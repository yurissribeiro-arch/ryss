import type { Metadata } from "next";
import { Suspense } from "react";
import { changePassword, updateProfile } from "../actions";
import { ActionForm } from "@/components/ActionForm";
import { AccountShell, AccountSkeleton } from "@/components/conta/AccountShell";
import { Checkbox, Field, MaskedField } from "@/components/conta/fields";
import { maskCpf } from "@/lib/br";
import { requireCustomer } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Meus dados",
  robots: { index: false },
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const { customer } = await requireCustomer("/conta/dados");
  return (
    <AccountShell title="Meus dados" active="/conta/dados">
      <ActionForm action={updateProfile} submitLabel="Salvar dados" className="flex max-w-xl flex-col gap-4">
        <Field name="fullName" label="Nome completo" defaultValue={customer.full_name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF" value={maskCpf(customer.cpf)} disabled readOnly hint="Para alterar, fale com a loja." />
          <Field
            name="birthDate"
            type="date"
            label="Data de nascimento"
            defaultValue={customer.birth_date ?? ""}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MaskedField mask="phone" name="phone" label="Celular" defaultValue={customer.phone} required />
          <Field label="E-mail" value={customer.email} disabled readOnly hint="Para alterar, fale com a loja." />
        </div>
        <Checkbox name="marketingOptIn" defaultChecked={customer.marketing_opt_in}>
          Quero receber novidades e ofertas por e-mail e WhatsApp.
        </Checkbox>
      </ActionForm>

      <h2 className="mt-12 text-xs font-semibold uppercase tracking-[0.2em]">Trocar senha</h2>
      <ActionForm
        action={changePassword}
        submitLabel="Trocar senha"
        resetOnSuccess
        className="mt-4 flex max-w-xl flex-col gap-4"
      >
        <Field name="currentPassword" type="password" label="Senha atual" autoComplete="current-password" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="password" type="password" label="Nova senha" autoComplete="new-password" minLength={8} required />
          <Field name="passwordConfirm" type="password" label="Repita a nova senha" autoComplete="new-password" required />
        </div>
      </ActionForm>
    </AccountShell>
  );
}
