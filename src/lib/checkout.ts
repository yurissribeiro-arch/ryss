import { z } from "zod";
import {
  isValidCep,
  isValidCpf,
  isValidPhone,
  onlyDigits,
  UFS,
} from "./br";
import { MAX_QTY_PER_ITEM } from "./cart-limits";

/** Formas de pagamento previstas. Nenhuma cobrança é feita ainda. */
export const PAYMENT_METHODS = {
  pix: "PIX",
  cartao: "Cartão de crédito",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `${label[0].toUpperCase()}${label.slice(1)} muito longo.`);

export const checkoutSchema = z.object({
  fullName: text("o nome completo", 120).refine(
    (v) => v.split(/\s+/).length >= 2,
    "Informe nome e sobrenome.",
  ),
  cpf: z
    .string()
    .refine(isValidCpf, "CPF inválido.")
    .transform(onlyDigits),
  email: z.email("E-mail inválido.").max(254),
  phone: z
    .string()
    .refine(isValidPhone, "Telefone inválido. Use DDD + número.")
    .transform(onlyDigits),
  cep: z.string().refine(isValidCep, "CEP inválido.").transform(onlyDigits),
  street: text("a rua", 160),
  number: text("o número", 20),
  complement: z.string().trim().max(80, "Complemento muito longo."),
  district: text("o bairro", 80),
  city: text("a cidade", 80),
  state: z.enum(UFS, "Selecione o estado."),
  paymentMethod: z.enum(
    Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]],
    "Escolha a forma de pagamento.",
  ),
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
      }),
    )
    .min(1, "Seu carrinho está vazio.")
    .max(30),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutField = Exclude<keyof CheckoutInput, "items">;

export type CheckoutResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<CheckoutField, string>>;
      /** Itens cuja quantidade precisa ser ajustada (0 = indisponível). */
      adjust?: { variantId: string; available: number }[];
    };
