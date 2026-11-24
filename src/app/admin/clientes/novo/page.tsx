import type { Metadata } from "next";
import { Suspense } from "react";
import { createCustomer } from "../../crm-actions";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { CustomerFields } from "@/components/admin/CustomerFields";
import { ActionForm } from "@/components/ActionForm";
import { btn } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Novo cliente" };

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewCustomer />
    </Suspense>
  );
}

async function NewCustomer() {
  const { email } = await requireAdmin();
  return (
    <AdminShell email={email} title="Novo cliente">
      <div className="max-w-2xl border border-line bg-paper p-5 md:p-6">
        <ActionForm action={createCustomer} submitLabel="Cadastrar cliente" buttonClassName={btn}>
          <CustomerFields />
        </ActionForm>
        <p className="mt-4 text-xs text-muted">
          Depois de cadastrar, você pode criar o acesso do cliente à loja definindo uma senha.
        </p>
      </div>
    </AdminShell>
  );
}
