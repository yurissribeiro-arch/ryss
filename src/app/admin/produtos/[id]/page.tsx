import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImages } from "@/components/admin/ProductImages";
import { btnOutline } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";
import { productImageUrl } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Editar produto" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditProductPage({ params }: PageProps<"/admin/produtos/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  sku: string | null;
  cost_cents: number | null;
  active: boolean;
  sort_order: number;
  product_images: { id: string; storage_path: string; alt: string; position: number }[];
  product_variants: { id: string; size: string; stock: number; position: number }[];
};

async function EditProduct({ params }: Pick<PageProps<"/admin/produtos/[id]">, "params">) {
  const { supabase, email } = await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: p, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price_cents, sku, cost_cents, active, sort_order, product_images(id, storage_path, alt, position), product_variants(id, size, stock, position)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "product_images" })
    .order("position", { referencedTable: "product_variants" })
    .maybeSingle<Row>();

  if (error) throw new Error(error.message);
  if (!p) notFound();

  return (
    <AdminShell
      email={email}
      title={p.name}
      actions={
        p.active ? (
          <Link href={`/produto/${p.slug}`} target="_blank" className={btnOutline}>
            Ver na loja ↗
          </Link>
        ) : undefined
      }
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProductForm
          product={{
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceCents: p.price_cents,
            sku: p.sku,
            costCents: p.cost_cents,
            active: p.active,
            sortOrder: p.sort_order,
            variants: p.product_variants.map((v) => ({
              id: v.id,
              size: v.size,
              stock: v.stock,
            })),
          }}
        />
        <ProductImages
          productId={p.id}
          images={p.product_images.map((img) => ({
            id: img.id,
            alt: img.alt,
            url: productImageUrl(img.storage_path) ?? "",
          }))}
        />
      </div>
      <div className="mt-12 border-t border-line pt-6">
        <DeleteProductButton id={p.id} name={p.name} />
      </div>
    </AdminShell>
  );
}
