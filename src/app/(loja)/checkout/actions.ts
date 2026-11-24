"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { checkoutSchema, type CheckoutField, type CheckoutResult } from "@/lib/checkout";
import { PRODUCTS_TAG } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { getCustomerSession } from "@/lib/customer-auth";
import type { SavedAddress } from "@/lib/address";

/**
 * Cria o pedido com status "aguardando_pagamento".
 * Tudo que vem do navegador é revalidado aqui; preço e estoque são lidos do
 * banco pela função create_order (supabase/migrations/0002_checkout.sql).
 */
export async function createOrder(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<CheckoutField, string>> = {};
    let itemsError: string | undefined;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "items") itemsError ??= issue.message;
      else if (typeof key === "string" && !(key in fieldErrors))
        fieldErrors[key as CheckoutField] = issue.message;
    }
    return {
      ok: false,
      message:
        Object.keys(fieldErrors).length > 0 || !itemsError
          ? "Confira os campos destacados."
          : "Há um problema com os itens do carrinho. Volte ao carrinho e tente novamente.",
      fieldErrors,
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        "A loja ainda não está pronta para receber pedidos. Tente novamente mais tarde.",
    };
  }

  const d = parsed.data;
  // Cliente logado: o pedido fica sempre no CPF e e-mail da própria conta.
  const session = await getCustomerSession();
  if (session?.customer) {
    d.cpf = session.customer.cpf;
    d.email = session.customer.email;
  }
  const { data, error } = await supabase
    .rpc("create_order", {
      p_customer: {
        full_name: d.fullName,
        cpf: d.cpf,
        email: d.email,
        phone: d.phone,
      },
      // Os dados de contato também ficam no pedido, como registro da compra.
      p_address: {
        recipient: d.fullName,
        email: d.email,
        phone: d.phone,
        cep: d.cep,
        street: d.street,
        number: d.number,
        complement: d.complement,
        district: d.district,
        city: d.city,
        state: d.state,
      },
      p_payment_method: d.paymentMethod,
      p_items: d.items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
      })),
    })
    .single<{ order_id: string; order_number: number; total_cents: number }>();

  if (error) return toFriendlyError(error.message);

  // O estoque mudou: atualiza vitrine e páginas de produto.
  updateTag(PRODUCTS_TAG);
  return { ok: true, orderId: data.order_id };
}

export type CartQuote = { variantId: string; priceCents: number; stock: number };

/**
 * Preço e estoque atuais dos itens do carrinho, direto do banco (sem cache).
 * Itens inativos ou inexistentes não aparecem na resposta.
 */
export async function quoteCart(variantIds: unknown): Promise<CartQuote[] | null> {
  // Sem banco configurado (ex.: exemplos do modo de desenvolvimento): não altera nada.
  const supabase = createPublicClient();
  if (!supabase) return null;

  const ids = z.array(z.uuid()).max(30).safeParse(variantIds);
  if (!ids.success || ids.data.length === 0) return [];

  const { data, error } = await supabase
    .from("product_variants")
    .select("id, stock, products!inner(price_cents, active)")
    .in("id", ids.data)
    .eq("products.active", true)
    .returns<{ id: string; stock: number; products: { price_cents: number } }[]>();

  if (error) {
    console.error("[checkout] falha ao consultar carrinho:", error.message);
    return null;
  }
  return data.map((row) => ({
    variantId: row.id,
    priceCents: row.products.price_cents,
    stock: row.stock,
  }));
}

export type CheckoutPrefill = {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  addresses: SavedAddress[];
};

/** Dados do cliente logado para preencher a finalização da compra. */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill | null> {
  const session = await getCustomerSession();
  if (!session?.customer) return null;
  const { customer, db } = session;
  const { data } = await db
    .from("customer_addresses")
    .select("id, label, cep, street, number, complement, district, city, state, is_default")
    .eq("customer_id", customer.id)
    .order("is_default", { ascending: false })
    .order("created_at")
    .returns<SavedAddress[]>();
  return {
    fullName: customer.full_name,
    cpf: customer.cpf,
    email: customer.email,
    phone: customer.phone,
    addresses: data ?? [],
  };
}

function toFriendlyError(message: string): CheckoutResult {
  if (message.includes("CLIENTE_BLOQUEADO")) {
    return {
      ok: false,
      message: "Não foi possível concluir o pedido com este cadastro. Fale com a loja.",
    };
  }
  const stock = /ESTOQUE:([0-9a-f-]{36}):(\d+)/.exec(message);
  if (stock) {
    return {
      ok: false,
      message:
        "Um dos itens não tem mais a quantidade escolhida. Ajustamos seu carrinho; confira e finalize de novo.",
      adjust: [{ variantId: stock[1], available: Number(stock[2]) }],
    };
  }
  const gone = /INDISPONIVEL:([0-9a-f-]{36})/.exec(message);
  if (gone) {
    return {
      ok: false,
      message:
        "Um dos itens não está mais disponível e foi retirado do carrinho. Confira e finalize de novo.",
      adjust: [{ variantId: gone[1], available: 0 }],
    };
  }
  console.error("[checkout] falha ao criar pedido:", message);
  return {
    ok: false,
    message: "Não foi possível concluir o pedido agora. Tente novamente em instantes.",
  };
}
