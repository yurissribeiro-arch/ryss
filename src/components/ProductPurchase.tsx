"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { addToCart } from "@/lib/cart";
import type { ProductImage, ProductVariant } from "@/lib/types";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    image: ProductImage | null;
    variants: ProductVariant[];
  };
};

type Feedback = { kind: "error" | "added"; text: string } | null;

export function ProductPurchase({ product }: Props) {
  const router = useRouter();
  const labelId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // Seleciona automaticamente quando só existe um tamanho disponível.
    const available = product.variants.filter((v) => v.stock > 0);
    return available.length === 1 ? available[0].id : null;
  });
  const [feedback, setFeedback] = useState<Feedback>(null);

  const selected = product.variants.find((v) => v.id === selectedId) ?? null;
  const soldOut = !product.variants.some((v) => v.stock > 0);

  function add(): boolean {
    if (!selected) {
      setFeedback({ kind: "error", text: "Selecione um tamanho." });
      return false;
    }
    const result = addToCart({
      variantId: selected.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size: selected.size,
      priceCents: product.priceCents,
      imageUrl: product.image?.url ?? null,
      imageAlt: product.image?.alt ?? product.name,
      maxQuantity: selected.stock,
    });
    if (!result.ok) {
      setFeedback({ kind: "error", text: result.reason });
      return false;
    }
    return true;
  }

  function handleAdd() {
    if (add()) {
      setFeedback({
        kind: "added",
        text: `Tamanho ${selected!.size} adicionado ao carrinho.`,
      });
    }
  }

  function handleBuyNow() {
    if (add()) router.push("/carrinho");
  }

  if (product.variants.length === 0 || soldOut) {
    return (
      <p className="mt-8 border border-line py-4 text-center text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Esgotado
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <p id={labelId} className="text-xs font-medium uppercase tracking-[0.2em]">
          Tamanho
        </p>
        {selected && selected.stock <= 3 && (
          <p className="text-xs text-muted">
            {selected.stock === 1
              ? "Última unidade"
              : `Últimas ${selected.stock} unidades`}
          </p>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="mt-3 flex flex-wrap gap-2"
      >
        {product.variants.map((v) => {
          const out = v.stock <= 0;
          const active = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={out ? `${v.size} (esgotado)` : v.size}
              disabled={out}
              onClick={() => {
                setSelectedId(v.id);
                setFeedback(null);
              }}
              className={`h-12 min-w-14 border px-4 text-sm font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : out
                    ? "cursor-not-allowed border-line text-[#c4c4c4] line-through"
                    : "border-line hover:border-ink"
              }`}
            >
              {v.size}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleBuyNow}
          className="h-12 bg-ink text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85"
        >
          Comprar agora
        </button>
        <button
          type="button"
          onClick={handleAdd}
          className="h-12 border border-ink text-sm font-medium uppercase tracking-[0.2em] transition-colors hover:bg-ink hover:text-paper"
        >
          Adicionar ao carrinho
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-5 text-sm ${
          feedback?.kind === "error" ? "text-red-700" : "text-muted"
        }`}
      >
        {feedback?.text}
        {feedback?.kind === "added" && (
          <>
            {" "}
            <Link href="/carrinho" className="text-ink underline underline-offset-4">
              Ver carrinho
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
