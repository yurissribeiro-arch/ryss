import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

type Props = {
  product: ProductSummary;
  /** As primeiras fotos da vitrine carregam com prioridade (LCP). */
  priority?: boolean;
};

export function ProductCard({ product, priority }: Props) {
  const content = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <ShirtPlaceholder />
        )}
        {product.isDemo && (
          <span className="absolute left-2 top-2 bg-ink px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-paper">
            Exemplo
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1 md:mt-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] md:text-sm">
          {product.name}
        </h2>
        <p className="text-sm text-muted tabular-nums">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </>
  );

  return (
    <Link href={`/produto/${product.slug}`} className="group block">
      {content}
    </Link>
  );
}

function ShirtPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <svg
        viewBox="0 0 64 64"
        className="w-1/3 text-[#d4d4d4]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M22 8l-12 6-6 14 9 4 3-6v32h28V26l3 6 9-4-6-14-12-6c-1 4-5 7-10 7s-9-3-10-7z" />
      </svg>
    </div>
  );
}
