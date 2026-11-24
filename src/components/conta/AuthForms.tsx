"use client";

import Link from "next/link";
import {
  requestPasswordReset,
  setNewPassword,
  signInCustomer,
  signUpCustomer,
} from "@/app/(loja)/conta/actions";
import { ActionForm } from "@/components/ActionForm";
import { Checkbox, Field, MaskedField } from "./fields";

const BUTTON =
  "flex h-12 w-full items-center justify-center bg-ink text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm
      action={signInCustomer}
      submitLabel="Entrar"
      pendingLabel="Entrando…"
      buttonClassName={BUTTON}
      hidden={{ next }}
    >
      <Field name="email" type="email" label="E-mail" autoComplete="email" required />
      <Field
        name="password"
        type="password"
        label="Senha"
        autoComplete="current-password"
        required
      />
      <Link
        href="/conta/esqueci-senha"
        className="-mt-1 self-end text-xs text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Esqueci minha senha
      </Link>
    </ActionForm>
  );
}

export function SignUpForm() {
  return (
    <ActionForm
      action={signUpCustomer}
      submitLabel="Criar conta"
      pendingLabel="Criando…"
      buttonClassName={BUTTON}
    >
      <Field name="fullName" label="Nome completo" autoComplete="name" required maxLength={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <MaskedField mask="cpf" name="cpf" label="CPF" placeholder="000.000.000-00" required />
        <Field
          name="birthDate"
          type="date"
          label="Data de nascimento"
          autoComplete="bday"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MaskedField
          mask="phone"
          name="phone"
          type="tel"
          label="Celular (com DDD)"
          placeholder="(00) 00000-0000"
          autoComplete="tel-national"
          required
        />
        <Field name="email" type="email" label="E-mail" autoComplete="email" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="password"
          type="password"
          label="Senha"
          autoComplete="new-password"
          minLength={8}
          hint="Mínimo de 8 caracteres."
          required
        />
        <Field
          name="passwordConfirm"
          type="password"
          label="Repita a senha"
          autoComplete="new-password"
          required
        />
      </div>
      <Checkbox name="acceptTerms">
        Li e aceito os{" "}
        <Link href="/termos" target="_blank" className="underline underline-offset-4">
          termos de uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" target="_blank" className="underline underline-offset-4">
          política de privacidade
        </Link>
        .
      </Checkbox>
      <Checkbox name="marketingOptIn">
        Quero receber novidades e ofertas por e-mail e WhatsApp (opcional; você pode cancelar
        quando quiser).
      </Checkbox>
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  return (
    <ActionForm
      action={requestPasswordReset}
      submitLabel="Enviar link"
      pendingLabel="Enviando…"
      buttonClassName={BUTTON}
    >
      <Field name="email" type="email" label="E-mail da conta" autoComplete="email" required />
    </ActionForm>
  );
}

export function NewPasswordForm() {
  return (
    <ActionForm
      action={setNewPassword}
      submitLabel="Salvar nova senha"
      buttonClassName={BUTTON}
    >
      <Field
        name="password"
        type="password"
        label="Nova senha"
        autoComplete="new-password"
        minLength={8}
        hint="Mínimo de 8 caracteres."
        required
      />
      <Field
        name="passwordConfirm"
        type="password"
        label="Repita a nova senha"
        autoComplete="new-password"
        required
      />
    </ActionForm>
  );
}
