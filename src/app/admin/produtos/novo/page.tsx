import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Novo produto" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  const { email } = await requireAdmin();
  return (
    <AdminShell email={email} title="Novo produto">
      <ProductForm product={null} />
      <p className="mt-6 text-sm text-muted">
        As fotos podem ser enviadas depois de salvar o produto.
      </p>
    </AdminShell>
  );
}
