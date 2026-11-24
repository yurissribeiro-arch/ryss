import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/conta/AccountShell";
import { LoginForm } from "@/components/conta/AuthForms";
import { safeNext } from "@/lib/form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

const NOTICES: Record<string, string> = {
  link: "O link expirou ou já foi usado. Entre com sua senha ou peça um novo link.",
};

export default function SignInPage({ searchParams }: PageProps<"/conta/entrar">) {
  return (
    <AuthCard
      title="Entrar"
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/conta/cadastro" className="underline underline-offset-4">
            Criar conta
          </Link>
        </>
      }
    >
      <Suspense fallback={<LoginForm next="/conta" />}>
        <SignIn searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function SignIn({ searchParams }: Pick<PageProps<"/conta/entrar">, "searchParams">) {
  const { next, erro } = await searchParams;
  const notice = typeof erro === "string" ? NOTICES[erro] : undefined;
  return (
    <>
      {notice && <p className="mb-6 border border-line px-4 py-3 text-xs">{notice}</p>}
      <LoginForm next={safeNext(typeof next === "string" ? next : null, "/conta")} />
    </>
  );
}
