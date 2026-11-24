import type { MetadataRoute } from "next";
import { LEGAL_LINKS } from "@/components/LegalPage";
import { site } from "@/config/site";
import { getShowcaseProducts } from "@/lib/products";

/** Mapa do site para buscadores: início, produtos à venda e páginas legais. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getShowcaseProducts();
  return [
    { url: site.url, changeFrequency: "daily", priority: 1 },
    ...products
      .filter((p) => !p.isDemo)
      .map((p) => ({
        url: `${site.url}/produto/${p.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...LEGAL_LINKS.map((l) => ({
      url: `${site.url}${l.href}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
