"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { PRODUCTS_TAG } from "@/lib/products";
import { PRODUCT_BUCKET } from "@/lib/supabase/public";
import { createSessionClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, productSchema, type ProductInput } from "@/lib/admin";

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function signIn(
  _prev: { message: string } | null,
  formData: FormData,
): Promise<{ message: string } | null> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(200) })
    .safeParse({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });
  if (!parsed.success) return { message: "Informe e-mail e senha." };

  const supabase = await createSessionClient();
  if (!supabase) return { message: "O banco de dados não está configurado." };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "E-mail ou senha incorretos." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { message: "Este usuário não tem permissão de administrador." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

function dbError(message: string) {
  if (message.includes("products_slug_key"))
    return "Já existe um produto com esse endereço (slug). Escolha outro.";
  if (message.includes("product_variants_product_id_size_key"))
    return "Há tamanhos repetidos.";
  console.error("[admin]", message);
  return "Não foi possível salvar. Tente novamente.";
}

export async function saveProduct(
  id: string | null,
  input: ProductInput,
): Promise<Result<{ id: string }>> {
  const { supabase } = await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const p = parsed.data;
  if (id && !z.uuid().safeParse(id).success) {
    return { ok: false, message: "Produto inválido." };
  }

  const fields = {
    name: p.name,
    slug: p.slug,
    description: p.description,
    price_cents: p.priceCents,
    sku: p.sku || null,
    cost_cents: p.costCents,
    active: p.active,
    sort_order: p.sortOrder,
  };

  let productId = id;
  if (productId) {
    const { error } = await supabase.from("products").update(fields).eq("id", productId);
    if (error) return { ok: false, message: dbError(error.message) };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(fields)
      .select("id")
      .single<{ id: string }>();
    if (error) return { ok: false, message: dbError(error.message) };
    productId = data.id;
  }

  // Tamanhos: atualiza os existentes, cria os novos e remove os retirados.
  const { data: current, error: readError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .returns<{ id: string }[]>();
  if (readError) return { ok: false, message: dbError(readError.message) };

  const keep = new Set(p.variants.flatMap((v) => (v.id ? [v.id] : [])));
  const removed = current.map((v) => v.id).filter((v) => !keep.has(v));
  if (removed.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", removed);
    if (error) return { ok: false, message: dbError(error.message) };
  }

  const existing = new Set(current.map((v) => v.id));
  for (const [position, v] of p.variants.entries()) {
    const row = { product_id: productId, size: v.size, stock: v.stock, position };
    const { error } =
      v.id && existing.has(v.id)
        ? await supabase.from("product_variants").update(row).eq("id", v.id)
        : await supabase.from("product_variants").insert(row);
    if (error) return { ok: false, message: dbError(error.message) };
  }

  updateTag(PRODUCTS_TAG);
  return { ok: true, data: { id: productId } };
}

export async function deleteProduct(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Produto inválido." };

  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id)
    .returns<{ storage_path: string }[]>();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, message: dbError(error.message) };

  if (images?.length) {
    await supabase.storage.from(PRODUCT_BUCKET).remove(images.map((i) => i.storage_path));
  }
  updateTag(PRODUCTS_TAG);
  redirect("/admin/produtos");
}

// ---------------------------------------------------------------------------
// Fotos (o arquivo é enviado pelo navegador direto ao Storage; aqui só o registro)
// ---------------------------------------------------------------------------

export async function addProductImage(
  productId: string,
  storagePath: string,
): Promise<Result> {
  const { supabase } = await requireAdmin();
  const ok =
    z.uuid().safeParse(productId).success &&
    storagePath.startsWith(`${productId}/`) &&
    /^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|jpeg|png|webp|avif)$/i.test(storagePath);
  if (!ok) return { ok: false, message: "Arquivo inválido." };

  const { data: last } = await supabase
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return { ok: false, message: dbError(error.message) };
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}

export async function updateImageAlt(imageId: string, alt: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z.string().trim().max(200).safeParse(alt);
  if (!z.uuid().safeParse(imageId).success || !parsed.success) {
    return { ok: false, message: "Dados inválidos." };
  }
  const { error } = await supabase
    .from("product_images")
    .update({ alt: parsed.data })
    .eq("id", imageId);
  if (error) return { ok: false, message: dbError(error.message) };
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(imageId).success) return { ok: false, message: "Foto inválida." };

  const { data: image, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .select("storage_path")
    .maybeSingle<{ storage_path: string }>();
  if (error) return { ok: false, message: dbError(error.message) };
  if (image) await supabase.storage.from(PRODUCT_BUCKET).remove([image.storage_path]);
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}

/** Define a ordem das fotos (a primeira é a capa da vitrine). */
export async function reorderImages(productId: string, imageIds: string[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  const ids = z.array(z.uuid()).max(50).safeParse(imageIds);
  if (!z.uuid().safeParse(productId).success || !ids.success) {
    return { ok: false, message: "Dados inválidos." };
  }
  for (const [position, id] of ids.data.entries()) {
    const { error } = await supabase
      .from("product_images")
      .update({ position })
      .eq("id", id)
      .eq("product_id", productId);
    if (error) return { ok: false, message: dbError(error.message) };
  }
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export async function setOrderStatus(orderId: string, status: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z.enum(ORDER_STATUSES).safeParse(status);
  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return { ok: false, message: "Dados inválidos." };
  }
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: parsed.data,
  });
  if (error) {
    if (error.message.includes("PEDIDO_CANCELADO"))
      return { ok: false, message: "Pedido cancelado não pode ser reaberto." };
    console.error("[admin] status:", error.message);
    return { ok: false, message: "Não foi possível alterar a situação." };
  }
  // Cancelamentos devolvem estoque.
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}
