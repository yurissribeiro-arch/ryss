import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMER_FIELDS, statsFor, type CustomerRow, type CustomerStats } from "./crm";

/**
 * Público de marketing. Por LGPD, só entram clientes que AUTORIZARAM receber
 * marketing e que não estão bloqueados.
 */
export type SegmentFilters = {
  tag?: string;
  /** "compradores" | "nunca_compraram" */
  compras?: string;
  /** Sem comprar há pelo menos N dias. */
  inativos?: string;
  /** Total gasto mínimo, em reais. */
  gasto?: string;
  /** Aniversariantes do mês (1–12). */
  aniversario?: string;
};

export function readSegment(params: Record<string, string | string[] | undefined>): SegmentFilters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  return {
    tag: get("tag"),
    compras: get("compras"),
    inativos: get("inativos"),
    gasto: get("gasto"),
    aniversario: get("aniversario"),
  };
}

export async function findAudience(db: SupabaseClient, f: SegmentFilters) {
  const now = Date.now();
  let query = db
    .from("customers")
    .select(CUSTOMER_FIELDS)
    .eq("marketing_opt_in", true)
    .eq("blocked", false)
    .order("full_name")
    .limit(5000);
  const tag = f.tag?.replace(/[^\p{L}\p{N} _-]/gu, "").trim().toLowerCase();
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query.returns<CustomerRow[]>();
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const stats = await statsFor(db, rows.map((r) => r.id));

  const inactiveDays = Number(f.inativos);
  const minSpent = Number(f.gasto?.replace(",", "."));
  const month = Number(f.aniversario);

  const audience = rows.filter((c) => {
    const s: CustomerStats | undefined = stats.get(c.id);
    const orders = s?.orders_count ?? 0;
    if (f.compras === "compradores" && orders === 0) return false;
    if (f.compras === "nunca_compraram" && orders > 0) return false;
    if (inactiveDays > 0) {
      if (!s?.last_order_at) return false;
      if (now - new Date(s.last_order_at).getTime() < inactiveDays * 86_400_000) return false;
    }
    if (minSpent > 0 && (s?.total_spent_cents ?? 0) < minSpent * 100) return false;
    if (month >= 1 && month <= 12) {
      if (!c.birth_date || Number(c.birth_date.slice(5, 7)) !== month) return false;
    }
    return true;
  });
  return { audience, stats };
}
