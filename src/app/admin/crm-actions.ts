"use server";

import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { site } from "@/config/site";
import { parsePrice } from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { isValidBirthDate, isValidCpf, isValidPhone, onlyDigits } from "@/lib/br";
import { checkbox, fail, field, firstIssue, isUuid, ok, type FormState } from "@/lib/form";
import { PRODUCTS_TAG } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";

/** Painel + cliente com a chave secreta (necessário para contas de acesso). */
async function adminContext() {
  const session = await requireAdmin();
  const db = createAdminClient();
  if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  const {
    data: { user },
  } = await session.supabase.auth.getUser();
  return { ...session, db, userId: user?.id ?? null };
}

const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "Senha muito longa.");

function parseTags(text: string) {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .map((t) => t.slice(0, 30)),
    ),
  ).slice(0, 20);
}

const customerSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome.").max(120),
  cpf: z.string().refine(isValidCpf, "CPF inválido.").transform(onlyDigits),
  email: z.email("E-mail inválido.").max(254).transform((v) => v.toLowerCase()),
  phone: z.string().refine(isValidPhone, "Telefone inválido.").transform(onlyDigits),
  birthDate: z
    .string()
    .refine((v) => v === "" || isValidBirthDate(v), "Data de nascimento inválida."),
});

function customerFromForm(formData: FormData) {
  return customerSchema.safeParse({
    fullName: field(formData, "fullName"),
    cpf: field(formData, "cpf"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    birthDate: field(formData, "birthDate"),
  });
}

function dbMessage(message: string) {
  if (message.includes("customers_cpf_key")) return "Já existe um cliente com este CPF.";
  console.error("[crm]", message);
  return "Não foi possível salvar. Tente novamente.";
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await adminContext();
  const parsed = customerFromForm(formData);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;
  const marketing = checkbox(formData, "marketingOptIn");

  const { data, error } = await db
    .from("customers")
    .insert({
      full_name: d.fullName,
      cpf: d.cpf,
      email: d.email,
      phone: d.phone,
      birth_date: d.birthDate || null,
      tags: parseTags(field(formData, "tags")),
      marketing_opt_in: marketing,
      marketing_opt_in_at: marketing ? new Date().toISOString() : null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return fail(dbMessage(error.message));
  redirect(`/admin/clientes/${data.id}`);
}

export async function updateCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await adminContext();
  const id = field(formData, "id");
  if (!isUuid(id)) return fail("Cliente inválido.");
  const parsed = customerFromForm(formData);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const { data: current } = await db
    .from("customers")
    .select("user_id, email, marketing_opt_in")
    .eq("id", id)
    .maybeSingle<{ user_id: string | null; email: string; marketing_opt_in: boolean }>();
  if (!current) return fail("Cliente não encontrado.");

  // E-mail de quem tem conta: atualiza também o login.
  if (current.user_id && current.email.toLowerCase() !== d.email) {
    const { error } = await db.auth.admin.updateUserById(current.user_id, {
      email: d.email,
      email_confirm: true,
    });
    if (error) return fail("Este e-mail já é usado por outra conta.");
  }

  const marketing = checkbox(formData, "marketingOptIn");
  const { error } = await db
    .from("customers")
    .update({
      full_name: d.fullName,
      cpf: d.cpf,
      email: d.email,
      phone: d.phone,
      birth_date: d.birthDate || null,
      tags: parseTags(field(formData, "tags")),
      marketing_opt_in: marketing,
      marketing_opt_in_at:
        marketing && !current.marketing_opt_in ? new Date().toISOString() : undefined,
      blocked: checkbox(formData, "blocked"),
    })
    .eq("id", id);
  if (error) return fail(dbMessage(error.message));
  refresh();
  return ok("Cliente atualizado.");
}

/** Exclui o cliente (somente sem pedidos) e a conta de acesso, se houver. */
export async function deleteCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await adminContext();
  const id = field(formData, "id");
  if (!isUuid(id)) return fail("Cliente inválido.");

  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);
  if ((count ?? 0) > 0) {
    return fail(
      "Clientes com pedidos não podem ser excluídos (os pedidos precisam ser guardados por lei). Use “Bloquear”.",
    );
  }
  const { data: customer } = await db
    .from("customers")
    .delete()
    .eq("id", id)
    .select("user_id")
    .maybeSingle<{ user_id: string | null }>();
  if (customer?.user_id) await db.auth.admin.deleteUser(customer.user_id);
  redirect("/admin/clientes");
}

// ---------------------------------------------------------------------------
// Acesso do cliente (senhas nunca são lidas, apenas redefinidas)
// ---------------------------------------------------------------------------

async function customerAccount(db: NonNullable<ReturnType<typeof createAdminClient>>, id: string) {
  return db
    .from("customers")
    .select("id, email, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; email: string; user_id: string | null }>();
}

export async function setCustomerPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await adminContext();
  const id = field(formData, "id");
  const parsed = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!isUuid(id)) return fail("Cliente inválido.");
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { data: c } = await customerAccount(db, id);
  if (!c) return fail("Cliente não encontrado.");

  if (c.user_id) {
    const { error } = await db.auth.admin.updateUserById(c.user_id, { password: parsed.data });
    if (error) return fail("Não foi possível definir a senha.");
  } else {
    // Sem conta ainda: cria o acesso com o e-mail do cadastro.
    const { data, error } = await db.auth.admin.createUser({
      email: c.email,
      password: parsed.data,
      email_confirm: true,
    });
    if (error || !data.user) {
      return fail("Não foi possível criar o acesso. Este e-mail já pode ter outra conta.");
    }
    await db.from("customers").update({ user_id: data.user.id }).eq("id", c.id);
  }

  await db.from("customer_notes").insert({
    customer_id: c.id,
    author_id: userId,
    body: c.user_id ? "Senha redefinida pela equipe." : "Acesso à conta criado pela equipe.",
  });
  refresh();
  return ok("Senha definida. Informe ao cliente por um canal seguro.");
}

/**
 * Gera um link de redefinição de senha para enviar ao cliente (WhatsApp ou e-mail).
 * O link vale por tempo limitado e só pode ser usado uma vez.
 */
export async function generateResetLink(
  customerId: string,
): Promise<{ ok: true; link: string } | { ok: false; message: string }> {
  const { db, userId } = await adminContext();
  if (!isUuid(customerId)) return { ok: false, message: "Cliente inválido." };
  const { data: c } = await customerAccount(db, customerId);
  if (!c?.user_id) return { ok: false, message: "Este cliente ainda não tem conta de acesso." };

  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email: c.email });
  if (error || !data.properties?.hashed_token) {
    return { ok: false, message: "Não foi possível gerar o link." };
  }
  const h = await headers();
  const origin = h.get("origin") ?? site.url;
  const link = `${origin}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/conta/nova-senha`;

  await db.from("customer_notes").insert({
    customer_id: c.id,
    author_id: userId,
    body: "Link de redefinição de senha gerado pela equipe.",
  });
  refresh();
  return { ok: true, link };
}

// ---------------------------------------------------------------------------
// Atendimento: anotações e mensagens
// ---------------------------------------------------------------------------

export async function addCustomerNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await adminContext();
  const id = field(formData, "id");
  const body = field(formData, "body");
  if (!isUuid(id)) return fail("Cliente inválido.");
  if (!body) return fail("Escreva a anotação.");
  if (body.length > 5000) return fail("Anotação muito longa.");
  const { error } = await db
    .from("customer_notes")
    .insert({ customer_id: id, author_id: userId, body });
  if (error) return fail("Não foi possível salvar.");
  refresh();
  return ok("Anotação salva.");
}

/** Registra no histórico uma mensagem aberta pelo painel (WhatsApp ou e-mail). */
export async function logCustomerMessage(input: {
  customerId: string;
  channel: "whatsapp" | "email";
  subject: string;
  body: string;
}): Promise<{ ok: boolean }> {
  const { db, userId } = await adminContext();
  const parsed = z
    .object({
      customerId: z.uuid(),
      channel: z.enum(["whatsapp", "email"]),
      subject: z.string().max(200),
      body: z.string().min(1).max(5000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false };
  const { error } = await db.from("customer_messages").insert({
    customer_id: parsed.data.customerId,
    channel: parsed.data.channel,
    subject: parsed.data.subject,
    body: parsed.data.body,
    status: "manual",
    author_id: userId,
  });
  return { ok: !error };
}

export async function saveTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await adminContext();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Informe o nome do modelo.").max(80),
      channel: z.enum(["whatsapp", "email"], "Escolha o canal."),
      subject: z.string().trim().max(200),
      body: z.string().trim().min(1, "Escreva a mensagem.").max(5000),
    })
    .safeParse({
      name: field(formData, "name"),
      channel: field(formData, "channel"),
      subject: field(formData, "subject"),
      body: field(formData, "body"),
    });
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const id = field(formData, "id");
  const { error } = isUuid(id)
    ? await db.from("message_templates").update(parsed.data).eq("id", id)
    : await db.from("message_templates").insert(parsed.data);
  if (error) return fail("Não foi possível salvar o modelo.");
  refresh();
  return ok("Modelo salvo.");
}

export async function deleteTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await adminContext();
  const id = field(formData, "id");
  if (!isUuid(id)) return fail("Modelo inválido.");
  const { error } = await db.from("message_templates").delete().eq("id", id);
  if (error) return fail("Não foi possível excluir.");
  refresh();
  return ok("Modelo excluído.");
}

// ---------------------------------------------------------------------------
// Pedidos: frete, rastreio e anotações internas
// ---------------------------------------------------------------------------

export async function updateOrderShipping(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await adminContext();
  const id = field(formData, "id");
  if (!isUuid(id)) return fail("Pedido inválido.");
  const shippingText = field(formData, "shipping");
  const shipping = shippingText === "" ? 0 : parsePrice(shippingText);
  if (shipping === null) return fail("Valor do frete inválido. Exemplo: 25,90");

  const { data: order } = await supabase
    .from("orders")
    .select("subtotal_cents, status")
    .eq("id", id)
    .maybeSingle<{ subtotal_cents: number; status: string }>();
  if (!order) return fail("Pedido não encontrado.");

  const { error } = await supabase
    .from("orders")
    .update({
      shipping_cents: shipping,
      total_cents: order.subtotal_cents + shipping,
      shipping_carrier: field(formData, "carrier").slice(0, 60),
      tracking_code: field(formData, "tracking").slice(0, 60),
      internal_notes: field(formData, "notes").slice(0, 5000),
    })
    .eq("id", id);
  if (error) return fail("Não foi possível salvar.");
  refresh();
  return ok("Entrega atualizada.");
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

const ADJUST_TYPES = {
  entrada: { reason: "entrada", sign: 1 },
  devolucao: { reason: "devolucao", sign: 1 },
  perda: { reason: "perda", sign: -1 },
  ajuste_mais: { reason: "ajuste", sign: 1 },
  ajuste_menos: { reason: "ajuste", sign: -1 },
} as const;

export async function adjustStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await adminContext();
  const variantId = field(formData, "variantId");
  const type = field(formData, "type") as keyof typeof ADJUST_TYPES;
  const qty = Number(field(formData, "quantity"));
  if (!isUuid(variantId) || !(type in ADJUST_TYPES)) return fail("Dados inválidos.");
  if (!Number.isInteger(qty) || qty < 1 || qty > 100000) return fail("Quantidade inválida.");

  const t = ADJUST_TYPES[type];
  const { data, error } = await supabase.rpc("admin_adjust_stock", {
    p_variant_id: variantId,
    p_delta: t.sign * qty,
    p_reason: t.reason,
    p_note: field(formData, "note").slice(0, 300),
  });
  if (error) {
    if (/ESTOQUE_NEGATIVO|stock_check/.test(error.message)) {
      return fail("O estoque não pode ficar negativo.");
    }
    console.error("[estoque]", error.message);
    return fail("Não foi possível ajustar o estoque.");
  }
  updateTag(PRODUCTS_TAG);
  refresh();
  return ok(`Estoque atualizado: ${data} un.`);
}

// ---------------------------------------------------------------------------
// Equipe (administradores)
// ---------------------------------------------------------------------------

export async function addAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await adminContext();
  const email = field(formData, "email").toLowerCase();
  if (!z.email().safeParse(email).success) return fail("E-mail inválido.");
  const password = String(formData.get("password") ?? "");

  // Procura usuário existente; se não houver, cria com a senha informada.
  let target: string | null = null;
  for (let page = 1; page <= 20 && !target; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) target = found.id;
    if (data.users.length < 1000) break;
  }
  if (!target) {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return fail("Para um novo usuário, informe uma senha de 8+ caracteres.");
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: parsed.data,
      email_confirm: true,
    });
    if (error || !data.user) return fail("Não foi possível criar o usuário.");
    target = data.user.id;
  }

  const { data: isCustomer } = await db
    .from("customers")
    .select("id")
    .eq("user_id", target)
    .maybeSingle();
  if (isCustomer) {
    return fail("Este e-mail é de uma conta de cliente. Use outro e-mail para a equipe.");
  }

  const { error } = await db.from("admins").upsert({ user_id: target });
  if (error) return fail("Não foi possível adicionar.");
  refresh();
  return ok("Administrador adicionado.");
}

export async function removeAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, userId } = await adminContext();
  const id = field(formData, "userId");
  if (!isUuid(id)) return fail("Usuário inválido.");
  if (id === userId) return fail("Você não pode remover o seu próprio acesso.");
  const { error } = await db.from("admins").delete().eq("user_id", id);
  if (error) return fail("Não foi possível remover.");
  refresh();
  return ok("Acesso removido.");
}
