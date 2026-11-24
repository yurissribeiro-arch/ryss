import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { getShowcaseProducts, isDemoMode } from "@/lib/products";
import { site } from "@/config/site";

const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-12 xl:grid-cols-4";

export default function Home() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 md:px-8 md:pb-24 md:pt-10">
      <h1 className="sr-only">{site.name}: camisetas</h1>
      {isDemoMode() && (
        <p className="mb-6 border border-line px-3 py-2 text-xs text-muted">
          Modo de desenvolvimento: os itens abaixo são exemplos e não são
          produtos reais. Configure o Supabase para exibir o catálogo.
        </p>
      )}
      <Suspense fallback={<ShowcaseSkeleton />}>
        <Showcase />
      </Suspense>
    </div>
  );
}

async function Showcase() {
  const products = await getShowcaseProducts();

  if (products.length === 0) {
    return (
      <p className="py-24 text-center text-sm uppercase tracking-[0.2em] text-muted">
        Novos produtos em breve
      </p>
    );
  }

  return (
    <ul className={GRID}>
      {products.map((product, i) => (
        <li key={product.id}>
          <ProductCard product={product} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

function ShowcaseSkeleton() {
  return (
    <ul className={GRID} aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i}>
          <div className="aspect-[4/5] animate-pulse bg-mist" />
          <div className="mt-3 h-3 w-2/3 animate-pulse bg-mist" />
          <div className="mt-2 h-3 w-1/3 animate-pulse bg-mist" />
        </li>
      ))}
    </ul>
  );
}
