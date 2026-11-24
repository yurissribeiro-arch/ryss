"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { site } from "@/config/site";
import { addressFromForm } from "@/lib/address";
import { isValidBirthDate, isValidCpf, isValidPhone, onlyDigits } from "@/lib/br";
import { getCustomerSession, requireCustomer } from "@/lib/customer-auth";
import { checkbox, fail, field, firstIssue, isUuid, ok, safeNext, type FormState } from "@/lib/form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  return origin && /^https?:\/\//.test(origin) ? origin : site.url;
}

const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "Senha muito longa.");

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Informe o nome completo.")
    .max(120)
    .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  phone: z.string().refine(isValidPhone, "Celular inválido. Use DDD + número.").transform(onlyDigits),
  birthDate: z.string().refine(isValidBirthDate, "Data de nascimento inválida."),
});

// ---------------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------------

export async function signUpCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema
    .extend({
      cpf: z.string().refine(isValidCpf, "CPF inválido.").transform(onlyDigits),
      email: z.email("E-mail inválido.").max(254).transform((v) => v.toLowerCase()),
      password: passwordSchema,
      acceptTerms: z.literal(true, "É preciso aceitar os termos de uso e a política de privacidade."),
    })
    .safeParse({
      fullName: field(formData, "fullName"),
      phone: field(formData, "phone"),
      birthDate: field(formData, "birthDate"),
      cpf: field(formData, "cpf"),
      email: field(formData, "email"),
      password: String(formData.get("password") ?? ""),
      acceptTerms: checkbox(formData, "acceptTerms"),
    });
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (formData.get("password") !== formData.get("passwordConfirm")) {
    return fail("As senhas não conferem.");
  }

  const d = parsed.data;
  const marketing = checkbox(formData, "marketingOptIn");
  const supabase = await createSessionClient();
  const db = createAdminClient();
  if (!supabase || !db) return fail("O cadastro ainda não está disponível.");

  const { data: existing } = await db
    .from("customers")
    .select("id, email, user_id")
    .eq("cpf", d.cpf)
    .maybeSingle<{ id: string; email: string; user_id: string | null }>();

  if (existing?.user_id) {
    return fail("Já existe uma conta com este CPF. Entre ou use “Esqueci minha senha”.");
  }
  if (existing && existing.email.toLowerCase() !== d.email) {
    return fail(
      "Este CPF já tem compras com outro e-mail. Use o mesmo e-mail das compras ou fale com a loja.",
    );
  }

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/conta`,
      data: { full_name: d.fullName },
    },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) {
      return fail("Este e-mail já tem conta. Entre ou use “Esqueci minha senha”.");
    }
    console.error("[conta] cadastro:", error.message);
    return fail("Não foi possível criar a conta agora. Tente novamente.");
  }
  // Com confirmação de e-mail ligada, um e-mail já cadastrado volta sem identidades.
  if (!data.user || data.user.identities?.length === 0) {
    return fail("Este e-mail já tem conta. Entre ou use “Esqueci minha senha”.");
  }

  const profile = {
    full_name: d.fullName,
    email: d.email,
    phone: d.phone,
    birth_date: d.birthDate,
    user_id: data.user.id,
    marketing_opt_in: marketing,
    marketing_opt_in_at: marketing ? new Date().toISOString() : null,
  };
  const { error: dbError } = existing
    ? await db.from("customers").update(profile).eq("id", existing.id).is("user_id", null)
    : await db.from("customers").insert({ ...profile, cpf: d.cpf });

  if (dbError) {
    await db.auth.admin.deleteUser(data.user.id);
    console.error("[conta] perfil:", dbError.message);
    return fail("Não foi possível concluir o cadastro. Tente novamente.");
  }

  if (data.session) redirect("/conta");
  return ok(
    `Conta criada! Enviamos um e-mail para ${d.email}. Clique no link do e-mail para ativar a conta e depois entre.`,
  );
}

// ---------------------------------------------------------------------------
// Entrar / sair / senha
// ---------------------------------------------------------------------------

export async function signInCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!z.email().safeParse(email).success || !password) return fail("Informe e-mail e senha.");

  const supabase = await createSessionClient();
  if (!supabase) return fail("O acesso ainda não está disponível.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) {
      return fail("Confirme seu e-mail antes de entrar (veja sua caixa de entrada e o spam).");
    }
    return fail("E-mail ou senha incorretos.");
  }
  redirect(safeNext(field(formData, "next"), "/conta"));
}

export async function signOutCustomer() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  if (!z.email().safeParse(email).success) return fail("Informe um e-mail válido.");
  const supabase = await createSessionClient();
  if (!supabase) return fail("O acesso ainda não está disponível.");

  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/conta/nova-senha`,
  });
  if (error) console.error("[conta] redefinição:", error.message);
  // Mesma resposta sempre: não revela se o e-mail tem conta.
  return ok("Se este e-mail tiver conta, você vai receber um link para criar uma nova senha.");
}

/** Nova senha depois do link de redefinição (o link já faz o login). */
export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (formData.get("password") !== formData.get("passwordConfirm")) {
    return fail("As senhas não conferem.");
  }
  const session = await getCustomerSession();
  if (!session) return fail("O link expirou. Peça um novo em “Esqueci minha senha”.");

  const { error } = await session.supabase.auth.updateUser({ password: parsed.data });
  if (error) return fail("Não foi possível trocar a senha. Peça um novo link.");
  redirect("/conta?senha=alterada");
}

/** Troca de senha dentro da conta (pede a senha atual). */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireCustomer("/conta/dados");
  const parsed = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (formData.get("password") !== formData.get("passwordConfirm")) {
    return fail("As senhas não conferem.");
  }
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: String(formData.get("currentPassword") ?? ""),
  });
  if (authError) return fail("Senha atual incorreta.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return fail("Não foi possível trocar a senha.");
  return ok("Senha alterada.");
}

// ---------------------------------------------------------------------------
// Dados pessoais
// ---------------------------------------------------------------------------

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { customer, db } = await requireCustomer("/conta/dados");
  const parsed = profileSchema.safeParse({
    fullName: field(formData, "fullName"),
    phone: field(formData, "phone"),
    birthDate: field(formData, "birthDate"),
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const marketing = checkbox(formData, "marketingOptIn");
  const { error } = await db
    .from("customers")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      birth_date: parsed.data.birthDate,
      marketing_opt_in: marketing,
      marketing_opt_in_at:
        marketing && !customer.marketing_opt_in ? new Date().toISOString() : undefined,
    })
    .eq("id", customer.id);
  if (error) return fail("Não foi possível salvar.");
  refresh();
  return ok("Dados salvos.");
}

// ---------------------------------------------------------------------------
// Endereços
// ---------------------------------------------------------------------------

export async function saveAddress(_prev: FormState, formData: FormData): Promise<FormState> {
  const { customer, db } = await requireCustomer("/conta/enderecos");
  const parsed = addressFromForm(formData);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const id = field(formData, "id");
  const makeDefault = checkbox(formData, "isDefault");

  const { count } = await db
    .from("customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customer.id);
  if (!id && (count ?? 0) >= 10) return fail("Limite de 10 endereços.");

  const isDefault = makeDefault || (count ?? 0) === 0;
  if (isDefault) {
    await db.from("customer_addresses").update({ is_default: false }).eq("customer_id", customer.id);
  }

  const row = { ...parsed.data, is_default: isDefault };
  const { error } = isUuid(id)
    ? await db.from("customer_addresses").update(row).eq("id", id).eq("customer_id", customer.id)
    : await db.from("customer_addresses").insert({ ...row, customer_id: customer.id });
  if (error) return fail("Não foi possível salvar o endereço.");
  refresh();
  return ok("Endereço salvo.");
}

export async function deleteAddress(_prev: FormState, formData: FormData): Promise<FormState> {
  const { customer, db } = await requireCustomer("/conta/enderecos");
  const id = field(formData, "id");
  if (!isUuid(id)) return fail("Endereço inválido.");
  const { error } = await db
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", customer.id);
  if (error) return fail("Não foi possível excluir.");
  refresh();
  return ok("Endereço excluído.");
}
