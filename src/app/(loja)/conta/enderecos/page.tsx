import type { Metadata } from "next";
import { Suspense } from "react";
import { deleteAddress, saveAddress } from "../actions";
import { ActionForm } from "@/components/ActionForm";
import { AccountShell, AccountSkeleton } from "@/components/conta/AccountShell";
import { AddressFields, Checkbox } from "@/components/conta/fields";
import type { SavedAddress } from "@/lib/address";
import { maskCep } from "@/lib/br";
import { requireCustomer } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Endereços",
  robots: { index: false },
};

export default function AddressesPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <Addresses />
    </Suspense>
  );
}

const LINK_BUTTON =
  "text-xs uppercase tracking-[0.15em] text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50";

async function Addresses() {
  const { customer, db } = await requireCustomer("/conta/enderecos");
  const { data } = await db
    .from("customer_addresses")
    .select("id, label, cep, street, number, complement, district, city, state, is_default")
    .eq("customer_id", customer.id)
    .order("is_default", { ascending: false })
    .order("created_at")
    .returns<SavedAddress[]>();
  const addresses = data ?? [];

  return (
    <AccountShell title="Endereços" active="/conta/enderecos">
      {addresses.length > 0 && (
        <ul className="flex flex-col gap-4">
          {addresses.map((a) => (
            <li key={a.id} className="border border-line p-4 text-sm">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
                  <address className="not-italic leading-relaxed">
                    <span className="font-medium">
                      {a.label || "Endereço"}
                      {a.is_default && (
                        <span className="ml-2 bg-ink px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-paper">
                          Principal
                        </span>
                      )}
                    </span>
                    <br />
                    {a.street}, {a.number}
                    {a.complement && ` · ${a.complement}`}
                    <br />
                    {a.district} · {a.city}/{a.state} · CEP {maskCep(a.cep)}
                  </address>
                  <span className={LINK_BUTTON}>Editar</span>
                </summary>
                <div className="mt-6 border-t border-line pt-6">
                  <ActionForm action={saveAddress} submitLabel="Salvar endereço" hidden={{ id: a.id }}>
                    <AddressFields value={a} />
                    <Checkbox name="isDefault" defaultChecked={a.is_default}>
                      Usar como endereço principal
                    </Checkbox>
                  </ActionForm>
                  <ActionForm
                    action={deleteAddress}
                    submitLabel="Excluir endereço"
                    pendingLabel="Excluindo…"
                    confirmText="Excluir este endereço?"
                    hidden={{ id: a.id }}
                    className="mt-4"
                    buttonClassName={LINK_BUTTON}
                  >
                    {null}
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <section className={addresses.length > 0 ? "mt-10" : ""}>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">Novo endereço</h2>
        <ActionForm action={saveAddress} submitLabel="Adicionar endereço" resetOnSuccess className="mt-4 flex flex-col gap-4">
          <AddressFields />
          <Checkbox name="isDefault">Usar como endereço principal</Checkbox>
        </ActionForm>
      </section>
    </AccountShell>
  );
}
