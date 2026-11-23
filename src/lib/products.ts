import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient, productImageUrl } from "./supabase/public";
import type { ProductDetail, ProductSummary } from "./types";

/** Tag usada pelo painel para atualizar a vitrine após uma alteração. */
export const PRODUCTS_TAG = "products";

export function isDemoMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEMO_PRODUCTS === "true"
  );
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type ImageRow = { storage_path: string; alt: string; position: number };

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  product_images: ImageRow[];
};

type ProductDetailRow = ProductRow & {
  description: string;
  product_variants: { id: string; size: string; stock: number; position: number }[];
};

function toImages(rows: ImageRow[], fallbackAlt: string) {
  return rows.flatMap((img) => {
    const url = productImageUrl(img.storage_path);
    return url ? [{ url, alt: img.alt || fallbackAlt }] : [];
  });
}

export async function getShowcaseProducts(): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(PRODUCTS_TAG);

  const supabase = createPublicClient();
  if (!supabase) return isDemoMode() ? demoProducts() : [];

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, price_cents, product_images(storage_path, alt, position)")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "product_images", ascending: true })
    .limit(1, { referencedTable: "product_images" })
    .returns<ProductRow[]>();

  if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.price_cents,
    image: toImages(row.product_images, row.name)[0] ?? null,
  }));
}

/** Produto ativo pelo slug, com todas as fotos e o estoque por tamanho. */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(PRODUCTS_TAG, `product:${slug}`);

  if (!SLUG_RE.test(slug)) return null;

  const supabase = createPublicClient();
  if (!supabase) return isDemoMode() ? demoProductDetail(slug) : null;

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, description, price_cents, product_images(storage_path, alt, position), product_variants(id, size, stock, position)",
    )
    .eq("active", true)
    .eq("slug", slug)
    .order("position", { referencedTable: "product_images", ascending: true })
    .order("position", { referencedTable: "product_variants", ascending: true })
    .maybeSingle<ProductDetailRow>();

  if (error) throw new Error(`Falha ao carregar produto: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    priceCents: data.price_cents,
    images: toImages(data.product_images, data.name),
    variants: data.product_variants.map((v) => ({
      id: v.id,
      size: v.size,
      stock: v.stock,
    })),
  };
}

/** Slugs pré-renderizados no build (os primeiros da vitrine). */
export async function getFeaturedSlugs(limit = 12): Promise<string[]> {
  const products = await getShowcaseProducts();
  return products.slice(0, limit).map((p) => p.slug);
}

// ---------------------------------------------------------------------------
// Produtos de EXEMPLO, apenas em desenvolvimento. Nunca são exibidos em produção.
// ---------------------------------------------------------------------------
const DEMO_COUNT = 8;

function demoProducts(): ProductSummary[] {
  return Array.from({ length: DEMO_COUNT }, (_, i) => ({
    id: `demo-${i + 1}`,
    slug: `exemplo-${i + 1}`,
    name: `Exemplo ${i + 1}`,
    priceCents: 0,
    image: null,
    isDemo: true,
  }));
}

function demoProductDetail(slug: string): ProductDetail | null {
  const match = /^exemplo-(\d+)$/.exec(slug);
  const n = match ? Number(match[1]) : 0;
  if (n < 1 || n > DEMO_COUNT) return null;
  return {
    id: `demo-${n}`,
    slug,
    name: `Exemplo ${n}`,
    description:
      "Produto de exemplo do modo de desenvolvimento. Não está à venda.",
    priceCents: 0,
    images: [],
    // O tamanho GG esgotado permite testar o estado "esgotado".
    variants: [
      { id: `demo-${n}-M`, size: "M", stock: 5 },
      { id: `demo-${n}-G`, size: "G", stock: 2 },
      { id: `demo-${n}-GG`, size: "GG", stock: 0 },
    ],
    isDemo: true,
  };
}
