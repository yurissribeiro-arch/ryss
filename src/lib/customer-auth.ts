import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "./supabase/admin";
import { createSessionClient } from "./supabase/server";

export type CustomerProfile = {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  birth_date: string | null;
  marketing_opt_in: boolean;
  blocked: boolean;
};

const PROFILE_FIELDS =
  "id, full_name, cpf, email, phone, birth_date, marketing_opt_in, blocked";

/**
 * Cliente logado na loja (ou null). Os dados vêm do servidor com a chave
 * secreta, sempre filtrados pelo usuário da sessão.
 */
export async function getCustomerSession() {
  await cookies();
  const supabase = await createSessionClient();
  const db = createAdminClient();
  if (!supabase || !db) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customer } = await db
    .from("customers")
    .select(PROFILE_FIELDS)
    .eq("user_id", user.id)
    .maybeSingle<CustomerProfile>();

  return { user, customer, supabase, db };
}

/** Exige cliente logado; sem login, vai para a tela de entrar. */
export async function requireCustomer(next = "/conta") {
  const session = await getCustomerSession();
  if (!session?.customer) {
    redirect(`/conta/entrar?next=${encodeURIComponent(next)}`);
  }
  return { ...session, customer: session.customer };
}
