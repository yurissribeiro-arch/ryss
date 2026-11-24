import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSessionClient } from "./supabase/server";

export type AdminSession = {
  supabase: NonNullable<Awaited<ReturnType<typeof createSessionClient>>>;
  email: string;
};

/**
 * Garante que quem está acessando é um administrador.
 * Use em TODA página e Server Action do painel. Sem login, vai para /admin/login.
 */
export async function requireAdmin(): Promise<AdminSession> {
  // Lê a requisição antes de tudo: a verificação nunca acontece durante o build.
  await cookies();
  const supabase = await createSessionClient();
  if (!supabase) redirect("/admin/login?erro=config");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) redirect("/admin/login?erro=permissao");

  return { supabase, email: user.email ?? "" };
}
