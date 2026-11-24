import Link from "next/link";
import { site } from "@/config/site";

export const LEGAL_UPDATED_AT = "24 de novembro de 2026";

export const LEGAL_LINKS = [
  { href: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

/** Moldura comum das páginas institucionais. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
      <h1 className="text-sm font-semibold uppercase tracking-[0.28em]">{title}</h1>
      <p className="mt-2 text-xs text-muted">Atualizado em {LEGAL_UPDATED_AT}</p>
      <div className="legal mt-8 flex flex-col gap-4 text-sm leading-relaxed text-[#333]">
        {children}
      </div>
      <nav aria-label="Outras políticas" className="mt-12 border-t border-line pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.15em] text-muted">
          {LEGAL_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ink">
      {children}
    </h2>
  );
}

/** Canais de atendimento configurados em src/config/site.ts. */
export function ContactChannels() {
  const email: string = site.contact.email;
  const whatsapp: string = site.contact.whatsapp;
  const items: React.ReactNode[] = [];
  if (email)
    items.push(
      <a key="e" href={`mailto:${email}`} className="underline underline-offset-4">
        {email}
      </a>,
    );
  if (whatsapp)
    items.push(
      <a
        key="w"
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        WhatsApp
      </a>,
    );
  if (items.length === 0) return <>pelos canais de atendimento</>;
  return (
    <>
      pelo{items.length > 1 ? "s canais" : ""}{" "}
      {items.reduce<React.ReactNode[]>(
        (acc, item, i) => (i === 0 ? [item] : [...acc, " ou ", item]),
        [],
      )}
    </>
  );
}

/** Razão social, CNPJ e endereço, quando configurados. */
export function CompanyIdentification() {
  const { companyName, cnpj, address } = site.legal as {
    companyName: string;
    cnpj: string;
    address: string;
  };
  if (!companyName && !cnpj && !address) return null;
  return (
    <p>
      {[companyName, cnpj && `CNPJ ${cnpj}`, address].filter(Boolean).join(" · ")}
    </p>
  );
}
