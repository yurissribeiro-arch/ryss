import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchase } from "@/components/ProductPurchase";
import { formatPrice } from "@/lib/format";
import { getFeaturedSlugs, getProductBySlug } from "@/lib/products";
import { site } from "@/config/site";

/** Slug que nunca corresponde a um produto (usado quando o catálogo está vazio). */
const NO_PRODUCT = "__";

export async function generateStaticParams() {
  const slugs = await getFeaturedSlugs();
  // Com Cache Components é obrigatório devolver pelo menos um parâmetro.
  return (slugs.length ? slugs : [NO_PRODUCT]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };

  const description =
    product.description.slice(0, 160) || `${product.name} | ${site.name}`;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    robots: product.isDemo ? { index: false } : undefined,
    openGraph: {
      title: product.name,
      description,
      url: `/produto/${product.slug}`,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  };
}

export default function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  return (
    <div className="mx-auto max-w-[1440px] pb-16 md:px-8 md:pb-24 md:pt-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetails({
  params,
}: Pick<PageProps<"/produto/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const inStock = product.variants.some((v) => v.stock > 0);

  return (
    <>
      {!product.isDemo && <ProductJsonLd product={product} inStock={inStock} />}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] md:gap-10 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />

        <div className="px-4 md:px-0">
          <div className="md:sticky md:top-24">
            <nav aria-label="Navegação" className="mb-4 text-xs text-muted">
              <Link href="/" className="hover:text-ink">
                Início
              </Link>
              <span aria-hidden> / </span>
              <span className="text-ink">{product.name}</span>
            </nav>

            {product.isDemo && (
              <p className="mb-4 border border-line px-3 py-2 text-xs text-muted">
                Produto de exemplo (modo de desenvolvimento). Não está à venda.
              </p>
            )}

            <h1 className="text-lg font-semibold uppercase tracking-[0.12em] md:text-2xl">
              {product.name}
            </h1>
            <p className="mt-2 text-lg tabular-nums md:text-xl">
              {formatPrice(product.priceCents)}
            </p>

            <ProductPurchase
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                image: product.images[0] ?? null,
                variants: product.variants,
              }}
            />

            {product.description && (
              <section className="mt-10 border-t border-line pt-6">
                <h2 className="text-xs font-medium uppercase tracking-[0.2em]">
                  Descrição
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                  {product.description}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ProductJsonLd({
  product,
  inStock,
}: {
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
  inStock: boolean;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: `${site.url}/produto/${product.slug}`,
      priceCurrency: "BRL",
      price: (product.priceCents / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function ProductSkeleton() {
  return (
    <div
      className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] md:gap-10 lg:gap-16"
      aria-hidden
    >
      <div className="aspect-[4/5] animate-pulse bg-mist" />
      <div className="px-4 md:px-0">
        <div className="h-3 w-24 animate-pulse bg-mist" />
        <div className="mt-6 h-6 w-2/3 animate-pulse bg-mist" />
        <div className="mt-3 h-5 w-1/4 animate-pulse bg-mist" />
        <div className="mt-8 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 w-14 animate-pulse bg-mist" />
          ))}
        </div>
        <div className="mt-6 h-12 w-full animate-pulse bg-mist" />
        <div className="mt-3 h-12 w-full animate-pulse bg-mist" />
      </div>
    </div>
  );
}
