"use client";

import { useState } from "react";
import { maskCep, maskCpf, maskPhone, onlyDigits, UFS } from "@/lib/br";

export const inputClass =
  "h-12 w-full border border-line bg-paper px-3 text-sm outline-none placeholder:text-[#b5b5b5] focus:border-ink";
export const labelClass = "flex flex-col gap-1.5";
export const labelText = "text-xs font-medium uppercase tracking-[0.15em]";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Field({ label, hint, className = "", ...props }: InputProps) {
  return (
    <label className={`${labelClass} ${className}`}>
      <span className={labelText}>{label}</span>
      <input className={inputClass} {...props} />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const MASKS = { cpf: maskCpf, phone: maskPhone, cep: maskCep } as const;

/** Campo com máscara (CPF, celular, CEP). */
export function MaskedField({
  mask,
  defaultValue = "",
  onValue,
  ...props
}: InputProps & { mask: keyof typeof MASKS; defaultValue?: string; onValue?: (v: string) => void }) {
  const [value, setValue] = useState(MASKS[mask](defaultValue));
  return (
    <Field
      {...props}
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const v = MASKS[mask](e.target.value);
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

export function Checkbox({
  name,
  children,
  defaultChecked,
}: {
  name: string;
  children: React.ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-relaxed">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-ink"
      />
      <span>{children}</span>
    </label>
  );
}

export type AddressValue = {
  id?: string;
  label?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  is_default?: boolean;
};

/** Campos de endereço com busca automática pelo CEP (ViaCEP). */
export function AddressFields({ value = {} }: { value?: AddressValue }) {
  const [addr, setAddr] = useState({
    street: value.street ?? "",
    district: value.district ?? "",
    city: value.city ?? "",
    state: value.state ?? "",
  });
  const [status, setStatus] = useState<string | null>(null);

  async function lookup(masked: string) {
    const cep = onlyDigits(masked);
    if (cep.length !== 8) return;
    setStatus("Buscando endereço…");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setStatus("CEP não encontrado. Preencha o endereço.");
        return;
      }
      setAddr((a) => ({
        street: data.logradouro || a.street,
        district: data.bairro || a.district,
        city: data.localidade || a.city,
        state: (UFS as readonly string[]).includes(data.uf) ? data.uf : a.state,
      }));
      setStatus(null);
    } catch {
      setStatus("Não foi possível buscar o CEP. Preencha o endereço.");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MaskedField
        mask="cep"
        name="cep"
        label="CEP"
        autoComplete="postal-code"
        placeholder="00000-000"
        defaultValue={value.cep}
        onValue={lookup}
        hint={status ?? undefined}
        required
      />
      <Field
        name="label"
        label="Nome do endereço (opcional)"
        placeholder="Casa, Trabalho…"
        defaultValue={value.label}
        maxLength={40}
      />
      <Field
        name="street"
        label="Rua / Avenida"
        className="sm:col-span-2"
        value={addr.street}
        onChange={(e) => setAddr({ ...addr, street: e.target.value })}
        required
      />
      <Field name="number" label="Número" defaultValue={value.number} required maxLength={20} />
      <Field name="complement" label="Complemento" defaultValue={value.complement} maxLength={80} />
      <Field
        name="district"
        label="Bairro"
        value={addr.district}
        onChange={(e) => setAddr({ ...addr, district: e.target.value })}
        required
      />
      <Field
        name="city"
        label="Cidade"
        value={addr.city}
        onChange={(e) => setAddr({ ...addr, city: e.target.value })}
        required
      />
      <label className={labelClass}>
        <span className={labelText}>Estado</span>
        <select
          name="state"
          className={inputClass}
          value={addr.state}
          onChange={(e) => setAddr({ ...addr, state: e.target.value })}
          required
        >
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
