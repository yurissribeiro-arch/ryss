import Link from "next/link";
import { signOutCustomer } from "@/app/(loja)/conta/actions";

const NAV = [
  { href: "/conta", label: "Meus pedidos" },
  { href: "/conta/dados", label: "Meus dados" },
  { href: "/conta/enderecos", label: "Endereços" },
] as const;

export function AccountShell({
  title,
  active,
  children,
}: {
  title: string;
  active: (typeof NAV)[number]["href"];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Minha conta</p>
      <h1 className="mt-2 text-sm font-semibold uppercase tracking-[0.28em]">{title}</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] md:gap-12">
        <nav aria-label="Minha conta">
          <ul className="flex gap-4 overflow-x-auto border-b border-line pb-3 text-xs uppercase tracking-[0.15em] md:flex-col md:border-0 md:pb-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === active ? "page" : undefined}
                  className={`whitespace-nowrap ${
                    item.href === active ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <form action={signOutCustomer}>
                <button
                  type="submit"
                  className="whitespace-nowrap uppercase tracking-[0.15em] text-muted hover:text-ink"
                >
                  Sair
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[480px] px-4 pb-16 pt-10 md:pb-24 md:pt-16">
      <h1 className="text-center text-sm font-semibold uppercase tracking-[0.28em]">{title}</h1>
      <div className="mt-8">{children}</div>
      {footer && <div className="mt-8 border-t border-line pt-6 text-center text-sm">{footer}</div>}
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-12 md:px-8" aria-hidden>
      <div className="h-4 w-40 animate-pulse bg-mist" />
      <div className="mt-8 h-64 animate-pulse bg-mist" />
    </div>
  );
}
