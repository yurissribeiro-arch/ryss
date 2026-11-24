import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/carrinho", "/checkout", "/pedido/", "/conta", "/auth/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
