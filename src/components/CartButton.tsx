"use client";

import Link from "next/link";
import { cartCount, useCart } from "@/lib/cart";

export function CartButton() {
  const count = cartCount(useCart());
  return (
    <Link
      href="/carrinho"
      aria-label={count ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho"}
      className="relative flex h-10 w-10 items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <path d="M5 8h14l-1 13H6L5 8z" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium tabular-nums text-paper">
          {count}
        </span>
      )}
    </Link>
  );
}
