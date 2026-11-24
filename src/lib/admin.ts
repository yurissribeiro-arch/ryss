import { z } from "zod";

export const ORDER_STATUSES = [
  "aguardando_pagamento",
  "pago",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  aguardando_pagamento: "bg-amber-50 text-amber-800",
  pago: "bg-green-50 text-green-800",
  em_separacao: "bg-blue-50 text-blue-800",
  enviado: "bg-indigo-50 text-indigo-800",
  entregue: "bg-mist text-ink",
  cancelado: "bg-red-50 text-red-800",
};

export const SUGGESTED_SIZES = ["PP", "P", "M", "G", "GG", "XG"];

/** "Camiseta Básica Preta" -> "camiseta-basica-preta" */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "129,90" ou "129.90" -> 12990. Retorna null se inválido. */
export function parsePrice(text: string): number | null {
  const clean = text.replace(/[R$\s.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120, "Nome muito longo."),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Endereço (slug) inválido: use letras minúsculas, números e hífens.",
    )
    .max(80),
  description: z.string().trim().max(5000, "Descrição muito longa."),
  priceCents: z
    .number("Preço inválido.")
    .int()
    .min(1, "Informe o preço.")
    .max(10_000_000, "Preço muito alto."),
  sku: z.string().trim().max(40, "Código (SKU) muito longo."),
  costCents: z.number().int().min(0).max(10_000_000).nullable(),
  active: z.boolean(),
  sortOrder: z.number().int().min(-10000).max(10000),
  variants: z
    .array(
      z.object({
        id: z.uuid().optional(),
        size: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z0-9]{1,6}$/, "Tamanho inválido (até 6 letras ou números)."),
        stock: z.number().int().min(0, "Estoque não pode ser negativo.").max(100000),
      }),
    )
    .max(20)
    .refine(
      (list) => new Set(list.map((v) => v.size.trim().toUpperCase())).size === list.length,
      "Há tamanhos repetidos.",
    ),
});
export type ProductInput = z.input<typeof productSchema>;
