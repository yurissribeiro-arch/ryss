import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { btn } from "@/components/admin/styles";
import { ShirtPlaceholder } from "@/components/ShirtPlaceholder";
import { requireAdmin } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Produtos" };

export default function ProductsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProductList />
    </Suspense>
  );
}

type Row = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  active: boolean;
  product_images: { storage_path: string; position: number }[];
  product_variants: { size: string; stock: number; position: number }[];
};

async function ProductList() {
  const { supabase, email } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price_cents, active, product_images(storage_path, position), product_variants(size, stock, position)",
    )
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "product_images" })
    .order("position", { referencedTable: "product_variants" })
    .returns<Row[]>();

  return (
    <AdminShell
      email={email}
      title="Produtos"
      actions={
        <Link href="/admin/produtos/novo" className={btn}>
          + Novo produto
        </Link>
      }
    >
      {error && <p className="text-sm text-red-700">Erro ao carregar: {error.message}</p>}
      {data && data.length === 0 && (
        <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
          Nenhum produto cadastrado ainda.
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line border border-line bg-paper">
          {data.map((p) => {
            const cover = p.product_images[0];
            const url = cover ? productImageUrl(cover.storage_path) : null;
            const total = p.product_variants.reduce((s, v) => s + v.stock, 0);
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/produtos/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-mist"
                >
                  <div className="relative aspect-[4/5] w-12 shrink-0 bg-mist">
                    {url ? (
                      <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <ShirtPlaceholder />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {p.product_variants.length
                        ? p.product_variants.map((v) => `${v.size}: ${v.stock}`).join(" · ")
                        : "Sem tamanhos"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums">{formatPrice(p.price_cents)}</p>
                    <p
                      className={`mt-0.5 text-xs ${
                        !p.active ? "text-muted" : total === 0 ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {!p.active ? "Oculto" : total === 0 ? "Esgotado" : "À venda"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
