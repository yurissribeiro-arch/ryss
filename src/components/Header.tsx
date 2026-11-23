import Link from "next/link";
import { Logo } from "./Logo";
import { site } from "@/config/site";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto grid h-14 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-16 md:px-8">
        <div />
        <Link href="/" aria-label={`${site.name}, página inicial`}>
          <Logo priority />
        </Link>
        {/* Ícone do carrinho entra aqui na etapa do carrinho. */}
        <div className="justify-self-end" />
      </div>
    </header>
  );
}
