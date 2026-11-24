import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { onlyDigits } from "./br";

export type CustomerRow = {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  birth_date: string | null;
  marketing_opt_in: boolean;
  tags: string[];
  blocked: boolean;
  user_id: string | null;
  created_at: string;
};

export type CustomerStats = {
  customer_id: string;
  orders_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
};

export type CustomerFilters = {
  q?: string;
  conta?: string; // "sim" | "nao"
  marketing?: string; // "sim" | "nao"
  tag?: string;
  /** Somente aniversariantes deste mês (1–12). */
  aniversario?: string;
};

export const CUSTOMER_FIELDS =
  "id, full_name, cpf, email, phone, birth_date, marketing_opt_in, tags, blocked, user_id, created_at";

/** Texto de busca seguro para os filtros do banco. */
function clean(q: string) {
  return q.replace(/[,()%*"'\\]/g, " ").trim().slice(0, 80);
}

export function readFilters(params: Record<string, string | string[] | undefined>): CustomerFilters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  return {
    q: get("q"),
    conta: get("conta"),
    marketing: get("marketing"),
    tag: get("tag"),
    aniversario: get("aniversario"),
  };
}

/** Clientes que atendem aos filtros (até `limit`), mais recentes primeiro. */
export async function findCustomers(
  db: SupabaseClient,
  filters: CustomerFilters,
  { limit = 50, offset = 0 } = {},
) {
  let query = db
    .from("customers")
    .select(CUSTOMER_FIELDS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const q = clean(filters.q ?? "");
  if (q) {
    const digits = onlyDigits(q);
    if (digits.length >= 3 && digits.length === q.replace(/[.\-\s/]/g, "").length) {
      query = query.or(`cpf.like.%${digits}%,phone.like.%${digits}%`);
    } else {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    }
  }
  if (filters.conta === "sim") query = query.not("user_id", "is", null);
  if (filters.conta === "nao") query = query.is("user_id", null);
  if (filters.marketing === "sim") query = query.eq("marketing_opt_in", true);
  if (filters.marketing === "nao") query = query.eq("marketing_opt_in", false);
  if (filters.tag) query = query.contains("tags", [clean(filters.tag).toLowerCase()]);

  const { data, count, error } = await query.returns<CustomerRow[]>();
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  const month = Number(filters.aniversario);
  if (month >= 1 && month <= 12) {
    rows = rows.filter((c) => c.birth_date && Number(c.birth_date.slice(5, 7)) === month);
  }
  return { rows, count: count ?? rows.length };
}

export async function statsFor(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, CustomerStats>();
  const { data } = await db
    .from("customer_stats")
    .select("customer_id, orders_count, total_spent_cents, last_order_at")
    .in("customer_id", ids)
    .returns<CustomerStats[]>();
  return new Map((data ?? []).map((s) => [s.customer_id, s]));
}

/** Escapa um valor para CSV (separador ;, padrão do Excel em português). */
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  // Evita que planilhas interpretem o conteúdo como fórmula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]) {
  // BOM para o Excel reconhecer acentos (UTF-8).
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export { fillTemplate } from "./crm-template";
