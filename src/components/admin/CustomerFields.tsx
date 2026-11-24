"use client";

import { useState } from "react";
import { maskCpf, maskPhone } from "@/lib/br";
import { input, label } from "./styles";

export type CustomerFieldValues = {
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  birth_date: string | null;
  tags: string[];
  marketing_opt_in: boolean;
  blocked: boolean;
};

/** Campos do cadastro do cliente no painel. */
export function CustomerFields({ value }: { value?: CustomerFieldValues }) {
  const [cpf, setCpf] = useState(maskCpf(value?.cpf ?? ""));
  const [phone, setPhone] = useState(maskPhone(value?.phone ?? ""));
  return (
    <>
      <label className={label}>
        Nome completo
        <input name="fullName" defaultValue={value?.full_name} required maxLength={120} className={`${input} w-full`} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          CPF
          <input
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            inputMode="numeric"
            required
            className={`${input} w-full`}
          />
        </label>
        <label className={label}>
          Data de nascimento
          <input name="birthDate" type="date" defaultValue={value?.birth_date ?? ""} className={`${input} w-full`} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          E-mail
          <input name="email" type="email" defaultValue={value?.email} required className={`${input} w-full`} />
        </label>
        <label className={label}>
          Telefone / WhatsApp
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            inputMode="tel"
            required
            className={`${input} w-full`}
          />
        </label>
      </div>
      <label className={label}>
        Etiquetas (separadas por vírgula)
        <input
          name="tags"
          defaultValue={value?.tags.join(", ")}
          placeholder="vip, atacado, revendedor"
          className={`${input} w-full`}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="marketingOptIn" defaultChecked={value?.marketing_opt_in} className="size-4 accent-ink" />
        Aceita receber marketing (somente com autorização do cliente — LGPD)
      </label>
      {value && (
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="blocked" defaultChecked={value.blocked} className="size-4 accent-ink" />
          Bloquear novas compras deste cliente
        </label>
      )}
    </>
  );
}
