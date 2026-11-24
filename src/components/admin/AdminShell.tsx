import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { site } from "@/config/site";

export { btn, btnOutline, input } from "./styles";

const NAV = [
  { href: "/admin", label: "Início" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/equipe", label: "Equipe" },
] as const;

/** Moldura das páginas do painel (somente para quem já passou por requireAdmin). */
export function AdminShell({
  email,
  title,
  actions,
  children,
}: {
  email: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/admin" className="text-sm font-semibold uppercase tracking-[0.24em]">
            {site.name} <span className="font-normal text-muted">· Painel</span>
          </Link>
          <nav aria-label="Painel" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-xs text-muted">
            <Link href="/" target="_blank" className="hover:text-ink">
              Ver loja ↗
            </Link>
            <span className="hidden sm:inline">{email}</span>
            <form action={signOut}>
              <button type="submit" className="underline-offset-4 hover:text-ink hover:underline">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </>
  );
}

export function PageLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8" aria-hidden>
      <div className="h-6 w-40 animate-pulse bg-line" />
      <div className="mt-6 h-64 animate-pulse bg-line/60" />
    </div>
  );
}
