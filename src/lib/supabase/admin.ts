import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave secreta (ignora RLS). Use SOMENTE no servidor, em ações
 * que validam a entrada antes de gravar (ex.: criação de pedidos).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
