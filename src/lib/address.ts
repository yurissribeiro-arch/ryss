import { z } from "zod";
import { isValidCep, onlyDigits, UFS } from "./br";

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Informe ${label}.`).max(max, `Campo muito longo: ${label}.`);

export const addressSchema = z.object({
  label: z.string().trim().max(40, "Nome do endereço muito longo."),
  cep: z.string().refine(isValidCep, "CEP inválido.").transform(onlyDigits),
  street: text("a rua", 160),
  number: text("o número", 20),
  complement: z.string().trim().max(80, "Complemento muito longo."),
  district: text("o bairro", 80),
  city: text("a cidade", 80),
  state: z.enum(UFS, "Selecione o estado."),
});
export type Address = z.output<typeof addressSchema>;

export function addressFromForm(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return addressSchema.safeParse({
    label: get("label"),
    cep: get("cep"),
    street: get("street"),
    number: get("number"),
    complement: get("complement"),
    district: get("district"),
    city: get("city"),
    state: get("state"),
  });
}

export type SavedAddress = Address & { id: string; is_default: boolean };
