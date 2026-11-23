import "server-only";
import { createClient } from "@supabase/supabase-js";

export const PRODUCT_BUCKET = "products";

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Cliente sem sessão, para leituras públicas (vitrine).
 * Não lê cookies, por isso pode ser usado dentro de funções com "use cache".
 * As políticas RLS garantem que só produtos ativos são retornados.
 */
export function createPublicClient() {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function productImageUrl(storagePath: string) {
  const config = supabaseConfig();
  if (!config) return null;
  return `${config.url}/storage/v1/object/public/${PRODUCT_BUCKET}/${storagePath}`;
}
