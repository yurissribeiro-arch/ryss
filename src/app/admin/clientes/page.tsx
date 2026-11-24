import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, PageLoading } from "@/components/admin/AdminShell";
import { btn, btnOutline, input } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin-auth";
import { maskCpf, maskPhone } from "@/lib/br";
import { findCustomers, readFilters, statsFor } from "@/lib/crm";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Clientes" };

const PAGE_SIZE = 50;
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <CustomerList searchParams={searchParams} />
    </Suspense>
  );
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

async function CustomerList({ searchParams }: Pick<PageProps<"/admin/clientes">, "searchParams">) {
  const { supabase, email } = await requireAdmin();
  const params = await searchParams;
  const filters = readFilters(params);
  const page = Math.max(1, Number(params.pagina) || 1);

  const { rows, count } = await findCustomers(supabase, filters, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const stats = await statsFor(supabase, rows.map((r) => r.id));

  const query = new URLSearchParams(
    Object.entries(filters).filter((e): e is [string, string] => !!e[1]),
  );
  const pageLink = (p: number) => {
    const q = new URLSearchParams(query);
    q.set("pagina", String(p));
    return `/admin/clientes?${q}`;
  };
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <AdminShell
      email={email}
      title={`Clientes (${count})`}
      actions={
        <div className="flex gap-2">
          <a href={`/admin/clientes/exportar?${query}`} className={btnOutline}>
            Exportar planilha
          </a>
          <Link href="/admin/clientes/novo" className={btn}>
            + Novo cliente
          </Link>
        </div>
      }
    >
      <form className="mb-5 grid gap-2 border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Nome, e-mail, CPF ou telefone"
          className={`${input} w-full`}
        />
        <select name="conta" defaultValue={filters.conta ?? ""} className={`${input} w-full`}>
          <option value="">Conta: todos</option>
          <option value="sim">Com conta</option>
          <option value="nao">Sem conta</option>
        </select>
        <select name="marketing" defaultValue={filters.marketing ?? ""} className={`${input} w-full`}>
          <option value="">Marketing: todos</option>
          <option value="sim">Aceita marketing</option>
          <option value="nao">Não aceita</option>
        </select>
        <select name="aniversario" defaultValue={filters.aniversario ?? ""} className={`${input} w-full`}>
          <option value="">Aniversário: todos</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input name="tag" defaultValue={filters.tag} placeholder="Etiqueta" className={`${input} w-full`} />
        <button type="submit" className={btn}>
          Filtrar
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
          Nenhum cliente encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
                <th className="px-4 py-3 text-right font-medium">Total gasto</th>
                <th className="px-4 py-3 font-medium">Última compra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const s = stats.get(c.id);
                return (
                  <tr key={c.id} className="hover:bg-mist">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clientes/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                        {c.full_name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        CPF {maskCpf(c.cpf)}
                        {c.user_id && " · com conta"}
                        {c.marketing_opt_in && " · marketing"}
                        {c.blocked && <span className="text-red-700"> · bloqueado</span>}
                      </p>
                      {c.tags.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span key={t} className="bg-mist px-1.5 py-0.5 text-[11px]">
                              {t}
                            </span>
                          ))}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.email}
                      <br />
                      <span className="text-muted">{maskPhone(c.phone)}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s?.orders_count ?? 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(s?.total_spent_cents ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {s?.last_order_at ? dateFmt.format(new Date(s.last_order_at)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={pageLink(page - 1)} className={btnOutline}>← Anterior</Link> : <span />}
          <span className="text-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link href={pageLink(page + 1)} className={btnOutline}>Próxima →</Link> : <span />}
        </nav>
      )}
    </AdminShell>
  );
}
