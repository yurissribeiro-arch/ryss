import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { adjustStock } from "../crm-actions";
import { ActionForm } from "@/components/ActionForm";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { btnOutline, input } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Estoque" };

export default function StockPage({ searchParams }: PageProps<"/admin/estoque">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Stock searchParams={searchParams} />
    </Suspense>
  );
}

type Row = {
  id: string;
  size: string;
  stock: number;
  sku: string | null;
  position: number;
  products: { id: string; name: string; active: boolean; price_cents: number; cost_cents: number | null; sku: string | null };
};

async function Stock({ searchParams }: Pick<PageProps<"/admin/estoque">, "searchParams">) {
  const { supabase, email } = await requireAdmin();
  const { filtro } = await searchParams;

  let query = supabase
    .from("product_variants")
    .select("id, size, stock, sku, position, products!inner(id, name, active, price_cents, cost_cents, sku)")
    .order("name", { referencedTable: "products" })
    .order("position")
    .limit(2000);
  if (filtro === "baixo") query = query.lte("stock", 2);
  if (filtro === "esgotado") query = query.eq("stock", 0);
  const { data, error } = await query.returns<Row[]>();
  const rows = (data ?? []).sort(
    (a, b) => a.products.name.localeCompare(b.products.name, "pt-BR") || a.position - b.position,
  );

  const units = rows.reduce((s, r) => s + r.stock, 0);
  const saleValue = rows.reduce((s, r) => s + r.stock * r.products.price_cents, 0);
  const costValue = rows.reduce((s, r) => s + r.stock * (r.products.cost_cents ?? 0), 0);
  const missingCost = rows.some((r) => r.stock > 0 && r.products.cost_cents == null);

  const filters = [
    { key: "", label: "Todos" },
    { key: "baixo", label: "Estoque baixo (≤ 2)" },
    { key: "esgotado", label: "Esgotados" },
  ];

  return (
    <AdminShell
      email={email}
      title="Estoque"
      actions={
        <Link href="/admin/estoque/movimentos" className={btnOutline}>
          Histórico de movimentos
        </Link>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Peças em estoque</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{units}</p>
        </div>
        <div className="border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Valor de venda</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPrice(saleValue)}</p>
        </div>
        <div className="border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">Valor de custo</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPrice(costValue)}</p>
          {missingCost && <p className="mt-1 text-xs text-muted">Alguns produtos estão sem custo cadastrado.</p>}
        </div>
      </div>

      <nav aria-label="Filtrar" className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/estoque?filtro=${f.key}` : "/admin/estoque"}
            className={`border px-3 py-1.5 text-xs ${
              (filtro ?? "") === f.key ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error && <p className="text-sm text-red-700">Erro ao carregar: {error.message}</p>}
      {rows.length === 0 ? (
        <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
          Nenhum tamanho encontrado.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_100px_minmax(0,460px)] md:items-center">
              <div className="min-w-0 text-sm">
                <Link href={`/admin/produtos/${r.products.id}`} className="font-medium underline-offset-4 hover:underline">
                  {r.products.name}
                </Link>
                <span className="text-muted"> · Tamanho {r.size}</span>
                <p className="text-xs text-muted">
                  {r.sku || r.products.sku ? `SKU ${r.sku || r.products.sku} · ` : ""}
                  {r.products.active ? "À venda" : "Oculto"}
                </p>
              </div>
              <p className={`text-sm tabular-nums ${r.stock === 0 ? "text-red-700" : r.stock <= 2 ? "text-amber-700" : ""}`}>
                {r.stock} un.
              </p>
              <ActionForm
                action={adjustStock}
                submitLabel="Aplicar"
                pendingLabel="…"
                resetOnSuccess
                hidden={{ variantId: r.id }}
                className="flex flex-wrap items-center gap-2"
                buttonClassName={`${btnOutline} h-9`}
              >
                <select name="type" aria-label="Tipo de movimento" className={`${input} h-9`} defaultValue="entrada">
                  <option value="entrada">+ Entrada</option>
                  <option value="devolucao">+ Devolução</option>
                  <option value="ajuste_mais">+ Ajuste</option>
                  <option value="perda">− Perda/avaria</option>
                  <option value="ajuste_menos">− Ajuste</option>
                </select>
                <input name="quantity" type="number" min={1} defaultValue={1} aria-label="Quantidade" className={`${input} h-9 w-20`} />
                <input name="note" placeholder="Observação" maxLength={300} aria-label="Observação" className={`${input} h-9 w-36`} />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
