"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Carrinho salvo no navegador (localStorage), sincronizado entre abas.
 * Preço e estoque aqui são apenas para exibição: o checkout recalcula tudo
 * no servidor a partir do banco antes de criar o pedido.
 */

const STORAGE_KEY = "ryss:cart:v1";
export const MAX_QTY_PER_ITEM = 10;

const cartItemSchema = z.object({
  variantId: z.string().min(1),
  productId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  size: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string(),
  quantity: z.number().int().positive(),
  /** Estoque conhecido quando o item foi adicionado. */
  maxQuantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

const EMPTY: CartItem[] = [];
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };
const listeners = new Set<() => void>();

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cache.items;
  }
  if (raw === cache.raw) return cache.items;

  let items = EMPTY;
  if (raw) {
    try {
      const parsed = z.array(cartItemSchema).safeParse(JSON.parse(raw));
      if (parsed.success) items = parsed.data;
    } catch {
      // conteúdo inválido: carrinho vazio
    }
  }
  cache = { raw, items };
  return items;
}

function write(items: CartItem[]) {
  const raw = JSON.stringify(items);
  cache = { raw, items };
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // armazenamento indisponível (modo privado): mantém em memória
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** true depois da hidratação (evita mostrar "carrinho vazio" antes de ler o navegador). */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
function noopSubscribe() {
  return () => {};
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

function limitFor(item: Pick<CartItem, "maxQuantity">) {
  return Math.min(item.maxQuantity, MAX_QTY_PER_ITEM);
}

export function addToCart(
  item: Omit<CartItem, "quantity">,
  quantity = 1,
): { ok: true } | { ok: false; reason: string } {
  const items = read();
  const existing = items.find((i) => i.variantId === item.variantId);
  const current = existing?.quantity ?? 0;
  const limit = limitFor(item);

  if (current + quantity > limit) {
    return {
      ok: false,
      reason:
        current >= limit
          ? "Quantidade máxima disponível já está no carrinho."
          : `Só é possível adicionar mais ${limit - current}.`,
    };
  }

  const next = existing
    ? items.map((i) =>
        i.variantId === item.variantId
          ? { ...item, quantity: current + quantity }
          : i,
      )
    : [...items, { ...item, quantity }];
  write(next);
  return { ok: true };
}

export function setQuantity(variantId: string, quantity: number) {
  const items = read();
  write(
    items.flatMap((i) => {
      if (i.variantId !== variantId) return [i];
      const q = Math.min(Math.max(0, Math.floor(quantity)), limitFor(i));
      return q > 0 ? [{ ...i, quantity: q }] : [];
    }),
  );
}

export function removeFromCart(variantId: string) {
  write(read().filter((i) => i.variantId !== variantId));
}

export function clearCart() {
  write([]);
}
