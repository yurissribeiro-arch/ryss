import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/conta/AccountShell";
import { SignUpForm } from "@/components/conta/AuthForms";

export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <AuthCard
      title="Criar conta"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/conta/entrar" className="underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <p className="mb-6 text-sm text-muted">
        Com a conta você acompanha seus pedidos e compra mais rápido. Se já comprou como
        visitante, use o mesmo CPF e e-mail para ver os pedidos anteriores.
      </p>
      <SignUpForm />
    </AuthCard>
  );
}
