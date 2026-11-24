import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/conta/AccountShell";
import { ForgotPasswordForm } from "@/components/conta/AuthForms";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Esqueci minha senha"
      footer={
        <Link href="/conta/entrar" className="underline underline-offset-4">
          Voltar para entrar
        </Link>
      }
    >
      <p className="mb-6 text-sm text-muted">
        Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
      </p>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
