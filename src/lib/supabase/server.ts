import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./public";

/**
 * Cliente com a sessão do usuário logado (cookies). As políticas RLS decidem
 * o que ele pode ler e alterar. Leia sempre dentro de <Suspense> ou de uma
 * Server Action, pois depende da requisição.
 */
export async function createSessionClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Em Server Components não é possível gravar cookies; o proxy renova a sessão.
        }
      },
    },
  });
}
