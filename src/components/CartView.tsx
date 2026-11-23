"use client";

import Image from "next/image";
import Link from "next/link";
import {
  cartSubtotal,
  MAX_QTY_PER_ITEM,
  removeFromCart,
  setQuantity,
  useCart,
  useHydrated,
  type CartItem,
} from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ShirtPlaceholder } from "./ShirtPlaceholder";

export function CartView() {
  const items = useCart();
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="h-40 animate-pulse bg-mist" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Seu carrinho está vazio
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center bg-ink px-8 text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_340px] md:gap-16">
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item) => (
          <CartLine key={item.variantId} item={item} />
        ))}
      </ul>

      <aside className="md:sticky md:top-24 md:self-start">
        <dl className="flex items-baseline justify-between text-sm">
          <dt className="uppercase tracking-[0.2em]">Subtotal</dt>
          <dd className="text-lg tabular-nums">{formatPrice(subtotal)}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted">
          Frete calculado na finalização da compra.
        </p>
        <Link
          href="/checkout"
          className="mt-6 flex h-12 items-center justify-center bg-ink text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85"
        >
          Finalizar compra
        </Link>
        <Link
          href="/"
          className="mt-3 flex h-12 items-center justify-center border border-line text-sm uppercase tracking-[0.2em] transition-colors hover:border-ink"
        >
          Continuar comprando
        </Link>
      </aside>
    </div>
  );
}

function CartLine({ item }: { item: CartItem }) {
  const max = Math.min(item.maxQuantity, MAX_QTY_PER_ITEM);
  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/produto/${item.slug}`}
        className="relative aspect-[4/5] w-24 shrink-0 bg-mist md:w-28"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.imageAlt}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <ShirtPlaceholder />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/produto/${item.slug}`}
              className="block truncate text-sm font-medium uppercase tracking-[0.12em]"
            >
              {item.name}
            </Link>
            <p className="mt-1 text-xs text-muted">Tamanho {item.size}</p>
          </div>
          <p className="text-sm tabular-nums">
            {formatPrice(item.priceCents * item.quantity)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex h-10 items-center border border-line">
            <button
              type="button"
              aria-label={`Diminuir quantidade de ${item.name}`}
              onClick={() => setQuantity(item.variantId, item.quantity - 1)}
              className="h-full w-10 text-lg hover:bg-mist"
            >
              −
            </button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Aumentar quantidade de ${item.name}`}
              disabled={item.quantity >= max}
              onClick={() => setQuantity(item.variantId, item.quantity + 1)}
              className="h-full w-10 text-lg hover:bg-mist disabled:cursor-not-allowed disabled:text-[#c4c4c4] disabled:hover:bg-transparent"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeFromCart(item.variantId)}
            className="text-xs uppercase tracking-[0.15em] text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Remover
          </button>
        </div>
      </div>
    </li>
  );
}
