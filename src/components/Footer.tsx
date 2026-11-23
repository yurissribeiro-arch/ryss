import { cacheLife } from "next/cache";
import { Logo } from "./Logo";
import { site } from "@/config/site";

export async function Footer() {
  "use cache";
  cacheLife("days");
  const year = new Date().getFullYear();
  const email: string = site.contact.email;
  const whatsapp: string = site.contact.whatsapp;
  const instagram: string = site.contact.instagram;

  const contacts: { label: string; href: string }[] = [];
  if (email) contacts.push({ label: email, href: `mailto:${email}` });
  if (whatsapp)
    contacts.push({ label: "WhatsApp", href: `https://wa.me/${whatsapp}` });
  if (instagram)
    contacts.push({
      label: `@${instagram}`,
      href: `https://instagram.com/${instagram}`,
    });

  return (
    <footer className="mt-auto bg-ink text-paper">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-8">
        <Logo variant="white" />

        {contacts.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm text-paper/70">
            {contacts.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-paper"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-[1440px] px-4 py-5 text-xs text-paper/50 md:px-8">
          © {year} {site.name}
        </p>
      </div>
    </footer>
  );
}
