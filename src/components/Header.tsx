import Link from "next/link";
import { CartButton } from "./CartButton";
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
        <div className="flex items-center gap-1 justify-self-end">
          <Link
            href="/conta"
            aria-label="Minha conta"
            className="flex h-10 w-10 items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
