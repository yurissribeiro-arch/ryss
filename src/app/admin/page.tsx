import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { btnOutline } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";

export default function AdminHome() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { supabase, email } = await requireAdmin();

  const month = Number(
    new Intl.DateTimeFormat("pt-BR", { month: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  const [waiting, toShip, active, lowStock, customers, birthdays] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_pagamento"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pago", "em_separacao"]),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("product_variants")
      .select("size, stock, products!inner(id, name, active)")
      .lte("stock", 2)
      .eq("products.active", true)
      .order("stock")
      .limit(20)
      .returns<{ size: string; stock: number; products: { id: string; name: string } }[]>(),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("customers")
      .select("id, full_name, birth_date")
      .not("birth_date", "is", null)
      .limit(5000)
      .returns<{ id: string; full_name: string; birth_date: string }[]>(),
  ]);
  const birthdayList = (birthdays.data ?? [])
    .filter((c) => Number(c.birth_date.slice(5, 7)) === month)
    .sort((a, b) => a.birth_date.slice(8).localeCompare(b.birth_date.slice(8)));

  const cards = [
    { label: "Aguardando pagamento", value: waiting.count ?? 0, href: "/admin/pedidos?status=aguardando_pagamento" },
    { label: "Pagos / em separação", value: toShip.count ?? 0, href: "/admin/pedidos?status=a_enviar" },
    { label: "Produtos à venda", value: active.count ?? 0, href: "/admin/produtos" },
    { label: "Clientes", value: customers.count ?? 0, href: "/admin/clientes" },
  ];

  return (
    <AdminShell email={email} title="Início">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="border border-line bg-paper p-5 transition-colors hover:border-ink"
          >
            <p className="text-xs uppercase tracking-[0.15em] text-muted">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Estoque baixo (2 unidades ou menos)</h2>
        {lowStock.data && lowStock.data.length > 0 ? (
          <ul className="mt-3 divide-y divide-line border border-line bg-paper">
            {lowStock.data.map((v) => (
              <li key={`${v.products.id}-${v.size}`}>
                <Link
                  href={`/admin/produtos/${v.products.id}`}
                  className="flex justify-between gap-4 px-4 py-3 text-sm hover:bg-mist"
                >
                  <span>
                    {v.products.name} · <span className="text-muted">Tamanho {v.size}</span>
                  </span>
                  <span className={v.stock === 0 ? "text-red-700" : ""}>
                    {v.stock === 0 ? "Esgotado" : `${v.stock} un.`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Nenhum tamanho com estoque baixo.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">Aniversariantes do mês</h2>
        {birthdayList.length > 0 ? (
          <ul className="mt-3 divide-y divide-line border border-line bg-paper">
            {birthdayList.slice(0, 30).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clientes/${c.id}`}
                  className="flex justify-between gap-4 px-4 py-3 text-sm hover:bg-mist"
                >
                  <span>{c.full_name}</span>
                  <span className="text-muted">
                    {c.birth_date.slice(8, 10)}/{c.birth_date.slice(5, 7)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Nenhum aniversariante cadastrado neste mês.</p>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/admin/produtos/novo" className={btnOutline}>
          + Novo produto
        </Link>
        <Link href="/admin/pedidos" className={btnOutline}>
          Ver todos os pedidos
        </Link>
      </div>
    </AdminShell>
  );
}
