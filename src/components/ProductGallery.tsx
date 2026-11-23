import Image from "next/image";
import type { ProductImage } from "@/lib/types";
import { ShirtPlaceholder } from "./ShirtPlaceholder";

type Props = { images: ProductImage[]; name: string };

/**
 * Celular: carrossel horizontal com rolagem por toque (sem JavaScript).
 * Desktop: fotos em grade de duas colunas, a primeira em destaque.
 */
export function ProductGallery({ images, name }: Props) {
  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] bg-mist">
        <ShirtPlaceholder />
      </div>
    );
  }

  return (
    <div>
      <ul
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-2 md:overflow-visible [&::-webkit-scrollbar]:hidden"
        aria-label={`Fotos de ${name}`}
      >
        {images.map((img, i) => (
          <li
            key={img.url}
            className={`relative aspect-[4/5] w-full shrink-0 snap-center bg-mist ${
              i === 0 && images.length % 2 === 1 ? "md:col-span-2" : ""
            }`}
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 bg-paper/80 px-2 py-0.5 text-[11px] tabular-nums md:hidden">
                {i + 1}/{images.length}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
