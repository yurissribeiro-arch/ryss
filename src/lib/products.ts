import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient, productImageUrl } from "./supabase/public";
import type { ProductSummary } from "./types";

/** Tag usada pelo painel para atualizar a vitrine após uma alteração. */
export const PRODUCTS_TAG = "products";

export function isDemoMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEMO_PRODUCTS === "true"
  );
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  product_images: { storage_path: string; alt: string; position: number }[];
};

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

  return data.map((row) => {
    const img = row.product_images[0];
    const url = img ? productImageUrl(img.storage_path) : null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      priceCents: row.price_cents,
      image: url ? { url, alt: img.alt || row.name } : null,
    };
  });
}

/** Produtos de EXEMPLO, apenas em desenvolvimento. Nunca são exibidos em produção. */
function demoProducts(): ProductSummary[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `demo-${i + 1}`,
    slug: `exemplo-${i + 1}`,
    name: `Exemplo ${i + 1}`,
    priceCents: 0,
    image: null,
    isDemo: true,
  }));
}
