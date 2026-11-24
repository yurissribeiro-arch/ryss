"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProduct } from "@/app/admin/actions";
import { parsePrice, slugify, SUGGESTED_SIZES } from "@/lib/admin";
import { btn, btnOutline, input, label } from "./styles";

type Variant = { id?: string; size: string; stock: string };

export type ProductFormValue = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  sku: string | null;
  costCents: number | null;
  active: boolean;
  sortOrder: number;
  variants: { id: string; size: string; stock: number }[];
};

const centsToText = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function ProductForm({ product }: { product: ProductFormValue | null }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!product);
  const [price, setPrice] = useState(product ? centsToText(product.priceCents) : "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [cost, setCost] = useState(product?.costCents != null ? centsToText(product.costCents) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [active, setActive] = useState(product?.active ?? false);
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 0));
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants.map((v) => ({ id: v.id, size: v.size, stock: String(v.stock) })) ?? [],
  );
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const usedSizes = new Set(variants.map((v) => v.size.trim().toUpperCase()));

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants((list) => list.map((v, i) => (i === index ? { ...v, ...patch } : v)));
    setFeedback(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parsePrice(price);
    if (priceCents === null) {
      setFeedback({ ok: false, text: "Preço inválido. Exemplo: 129,90" });
      return;
    }
    const costCents = cost.trim() === "" ? null : parsePrice(cost);
    if (costCents === undefined || (cost.trim() !== "" && costCents === null)) {
      setFeedback({ ok: false, text: "Custo inválido. Exemplo: 45,00" });
      return;
    }
    const stockError = variants.find((v) => !/^\d+$/.test(v.stock.trim()));
    if (stockError) {
      setFeedback({ ok: false, text: `Estoque inválido no tamanho ${stockError.size || "(sem nome)"}.` });
      return;
    }
    if (active && variants.length === 0) {
      setFeedback({ ok: false, text: "Adicione pelo menos um tamanho para colocar à venda." });
      return;
    }
    startTransition(async () => {
      const result = await saveProduct(product?.id ?? null, {
        name,
        slug: slug || slugify(name),
        description,
        priceCents,
        sku,
        costCents,
        active,
        sortOrder: Number(sortOrder) || 0,
        variants: variants.map((v) => ({
          id: v.id,
          size: v.size,
          stock: Number(v.stock),
        })),
      });
      if (!result.ok) {
        setFeedback({ ok: false, text: result.message });
        return;
      }
      if (!product) {
        router.push(`/admin/produtos/${result.data.id}`);
      } else {
        setFeedback({ ok: true, text: "Alterações salvas." });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 border border-line bg-paper p-5 md:p-6">
      <label className={label}>
        Nome do produto
        <input
          className={`${input} w-full`}
          value={name}
          maxLength={120}
          required
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
        />
      </label>

      <label className={label}>
        Endereço na loja
        <div className="flex items-center border border-line focus-within:border-ink">
          <span className="whitespace-nowrap pl-3 text-sm normal-case tracking-normal text-muted">
            /produto/
          </span>
          <input
            className="h-10 w-full bg-transparent pr-3 text-sm font-normal normal-case tracking-normal outline-none"
            value={slug}
            maxLength={80}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <span className="normal-case tracking-normal text-muted">
          Criado a partir do nome. Evite mudar depois de publicado (links antigos deixam de funcionar).
        </span>
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className={label}>
          Preço (R$)
          <input
            className={`${input} w-full`}
            inputMode="decimal"
            placeholder="129,90"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className={label}>
          Ordem na vitrine
          <input
            className={`${input} w-full`}
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <span className="normal-case tracking-normal text-muted">
            Números menores aparecem primeiro.
          </span>
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className={label}>
          Custo por peça (R$, opcional)
          <input
            className={`${input} w-full`}
            inputMode="decimal"
            placeholder="45,00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <span className="normal-case tracking-normal text-muted">
            Usado só no painel (margem e valor do estoque).
            {(() => {
              const pc = parsePrice(price);
              const cc = parsePrice(cost);
              return pc && cc != null && cost.trim()
                ? ` Margem: ${Math.round(((pc - cc) / pc) * 100)}%.`
                : "";
            })()}
          </span>
        </label>
        <label className={label}>
          Código (SKU, opcional)
          <input
            className={`${input} w-full`}
            value={sku}
            maxLength={40}
            onChange={(e) => setSku(e.target.value)}
          />
        </label>
      </div>

      <label className={label}>
        Descrição
        <textarea
          className="min-h-32 w-full border border-line px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-ink"
          value={description}
          maxLength={5000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <fieldset>
        <legend className="text-xs font-medium uppercase tracking-[0.12em]">
          Tamanhos e estoque
        </legend>
        {variants.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {variants.map((v, i) => (
              <li key={v.id ?? `new-${i}`} className="flex items-center gap-2">
                <input
                  aria-label="Tamanho"
                  className={`${input} w-24 uppercase`}
                  value={v.size}
                  maxLength={6}
                  onChange={(e) => updateVariant(i, { size: e.target.value.toUpperCase() })}
                />
                <input
                  aria-label={`Estoque do tamanho ${v.size}`}
                  className={`${input} w-28`}
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) => updateVariant(i, { stock: e.target.value })}
                />
                <span className="text-xs text-muted">unidades</span>
                <button
                  type="button"
                  onClick={() => setVariants((list) => list.filter((_, j) => j !== i))}
                  className="ml-auto text-xs text-muted underline-offset-4 hover:text-red-700 hover:underline"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_SIZES.filter((s) => !usedSizes.has(s)).map((s) => (
            <button
              key={s}
              type="button"
              className={`${btnOutline} h-9 px-3`}
              onClick={() => setVariants((list) => [...list, { size: s, stock: "0" }])}
            >
              + {s}
            </button>
          ))}
          <button
            type="button"
            className={`${btnOutline} h-9 px-3`}
            onClick={() => setVariants((list) => [...list, { size: "", stock: "0" }])}
          >
            + Outro
          </button>
        </div>
      </fieldset>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-ink"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Mostrar na loja (à venda)
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={btn}>
          {pending ? "Salvando…" : product ? "Salvar alterações" : "Criar produto"}
        </button>
        <p
          role="status"
          className={`text-sm ${feedback?.ok ? "text-green-700" : "text-red-700"}`}
        >
          {feedback?.text}
        </p>
      </div>
    </form>
  );
}
