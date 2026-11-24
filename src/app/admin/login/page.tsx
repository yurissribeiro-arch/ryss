import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  config: "O banco de dados ainda não está configurado no site.",
  permissao: "Este usuário não tem permissão de administrador.",
};

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm border border-line bg-paper p-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.24em]">
          {site.name}
        </p>
        <h1 className="mt-2 text-center text-xs uppercase tracking-[0.2em] text-muted">
          Painel administrativo
        </h1>
        <Suspense>
          <Notice searchParams={searchParams} />
        </Suspense>
        <LoginForm />
      </div>
    </main>
  );
}

async function Notice({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { erro } = await searchParams;
  const text = typeof erro === "string" ? NOTICES[erro] : undefined;
  if (!text) return null;
  return <p className="mt-6 border border-line px-3 py-2 text-xs text-red-700">{text}</p>;
}
