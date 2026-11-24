"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createOrder,
  getCheckoutPrefill,
  quoteCart,
  type CheckoutPrefill,
} from "@/app/(loja)/checkout/actions";
import { maskCep, maskCpf, maskPhone, onlyDigits, UFS } from "@/lib/br";
import {
  applyQuotes,
  cartSubtotal,
  clearCart,
  limitToStock,
  useCart,
  useHydrated,
} from "@/lib/cart";
import {
  PAYMENT_METHODS,
  type CheckoutField,
  type PaymentMethod,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { ShirtPlaceholder } from "./ShirtPlaceholder";

type Fields = Record<Exclude<CheckoutField, "paymentMethod">, string>;
type Errors = Partial<Record<CheckoutField, string>>;

const EMPTY_FIELDS: Fields = {
  fullName: "",
  cpf: "",
  email: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

type CepStatus = "idle" | "loading" | "found" | "not-found" | "error";

export function CheckoutForm() {
  const router = useRouter();
  const items = useCart();
  const hydrated = useHydrated();
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cepStatus, setCepStatus] = useState<CepStatus>("idle");
  const [pending, startTransition] = useTransition();
  const [quoted, setQuoted] = useState(false);
  const numberRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastCep = useRef("");
  const [account, setAccount] = useState<CheckoutPrefill | null>(null);
  const [addressId, setAddressId] = useState("");

  function fillAddress(a: CheckoutPrefill["addresses"][number]) {
    setAddressId(a.id);
    lastCep.current = a.cep;
    setFields((f) => ({
      ...f,
      cep: maskCep(a.cep),
      street: a.street,
      number: a.number,
      complement: a.complement,
      district: a.district,
      city: a.city,
      state: a.state,
    }));
  }

  // Cliente logado: preenche dados e endereço principal.
  useEffect(() => {
    let cancelled = false;
    getCheckoutPrefill().then(
      (data) => {
        if (cancelled || !data) return;
        setAccount(data);
        setFields((f) => ({
          ...f,
          fullName: data.fullName,
          cpf: maskCpf(data.cpf),
          email: data.email,
          phone: maskPhone(data.phone),
        }));
        if (data.addresses[0]) fillAddress(data.addresses[0]);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Confere preço e estoque atuais no servidor ao abrir a página.
  const idsKey = items.map((i) => i.variantId).sort().join(",");
  useEffect(() => {
    if (!hydrated || !idsKey) return;
    let cancelled = false;
    quoteCart(idsKey.split(",")).then((quotes) => {
      if (cancelled) return;
      if (quotes) {
        const result = applyQuotes(quotes);
        if (result.changed) {
          setNotice(
            "Alguns itens mudaram de disponibilidade e seu carrinho foi ajustado.",
          );
        } else if (result.priceChanged) {
          setNotice("Os preços foram atualizados.");
        }
      }
      setQuoted(true);
    }, () => setQuoted(true));
    return () => {
      cancelled = true;
    };
  }, [hydrated, idsKey]);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function lookupCep(masked: string) {
    const cep = onlyDigits(masked);
    if (cep.length !== 8 || cep === lastCep.current) return;
    lastCep.current = cep;
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) throw new Error(String(res.status));
      const data: {
        erro?: boolean | string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      } = await res.json();
      if (lastCep.current !== cep) return;
      if (data.erro) {
        setCepStatus("not-found");
        return;
      }
      setFields((f) => ({
        ...f,
        street: data.logradouro || f.street,
        district: data.bairro || f.district,
        city: data.localidade || f.city,
        state: (UFS as readonly string[]).includes(data.uf ?? "")
          ? data.uf!
          : f.state,
      }));
      setErrors((e) => ({
        ...e,
        cep: undefined,
        street: undefined,
        district: undefined,
        city: undefined,
        state: undefined,
      }));
      setCepStatus("found");
      numberRef.current?.focus();
    } catch {
      if (lastCep.current === cep) setCepStatus("error");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createOrder({
        ...fields,
        paymentMethod: payment,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      if (result.ok) {
        clearCart();
        router.replace(`/pedido/${result.orderId}`);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      result.adjust?.forEach((a) => limitToStock(a.variantId, a.available));
      // Leva o cliente ao primeiro campo com erro.
      const first = Object.keys(result.fieldErrors ?? {})[0];
      if (first) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${first}"]`)
          ?.focus();
      }
    });
  }

  if (!hydrated) {
    return <div className="h-96 animate-pulse bg-mist" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">
          Seu carrinho está vazio
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center bg-ink px-8 text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="grid gap-10 md:grid-cols-[minmax(0,1fr)_360px] md:gap-16"
    >
      <div className="flex flex-col gap-10">
        {!account && (
          <p className="border border-line px-4 py-3 text-sm">
            Já tem conta?{" "}
            <Link href="/conta/entrar?next=/checkout" className="underline underline-offset-4">
              Entre
            </Link>{" "}
            para preencher seus dados automaticamente.
          </p>
        )}
        <Section title="1. Seus dados">
          <Field
            label="Nome completo"
            name="fullName"
            autoComplete="name"
            value={fields.fullName}
            error={errors.fullName}
            onChange={(v) => set("fullName", v)}
            className="sm:col-span-2"
          />
          <Field
            label="CPF"
            name="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={fields.cpf}
            error={errors.cpf}
            onChange={(v) => set("cpf", maskCpf(v))}
            readOnly={!!account}
          />
          <Field
            label="Celular (com DDD)"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(00) 00000-0000"
            value={fields.phone}
            error={errors.phone}
            onChange={(v) => set("phone", maskPhone(v))}
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            error={errors.email}
            onChange={(v) => set("email", v.trim())}
            className="sm:col-span-2"
            readOnly={!!account}
          />
        </Section>

        <Section title="2. Endereço de entrega">
          {account && account.addresses.length > 0 && (
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.15em]">
                Endereços salvos
              </span>
              <select
                value={addressId}
                onChange={(e) => {
                  const a = account.addresses.find((x) => x.id === e.target.value);
                  if (a) fillAddress(a);
                  else setAddressId("");
                }}
                className="h-12 border border-line bg-paper px-3 text-sm"
              >
                {account.addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.label || "Endereço") + ` · ${a.street}, ${a.number}`}
                  </option>
                ))}
                <option value="">Outro endereço</option>
              </select>
            </label>
          )}
          <div className="sm:col-span-2 sm:max-w-[50%]">
            <Field
              label="CEP"
              name="cep"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={fields.cep}
              error={errors.cep}
              onChange={(v) => {
                const masked = maskCep(v);
                set("cep", masked);
                if (onlyDigits(masked).length === 8) lookupCep(masked);
                else setCepStatus("idle");
              }}
              hint={
                cepStatus === "loading"
                  ? "Buscando endereço…"
                  : cepStatus === "not-found"
                    ? "CEP não encontrado. Confira o número ou preencha o endereço."
                    : cepStatus === "error"
                      ? "Não foi possível buscar o CEP agora. Preencha o endereço."
                      : undefined
              }
            />
          </div>
          <Field
            label="Rua / Avenida"
            name="street"
            autoComplete="address-line1"
            value={fields.street}
            error={errors.street}
            onChange={(v) => set("street", v)}
            className="sm:col-span-2"
          />
          <Field
            ref={numberRef}
            label="Número"
            name="number"
            value={fields.number}
            error={errors.number}
            onChange={(v) => set("number", v)}
          />
          <Field
            label="Complemento (opcional)"
            name="complement"
            autoComplete="address-line2"
            value={fields.complement}
            error={errors.complement}
            onChange={(v) => set("complement", v)}
          />
          <Field
            label="Bairro"
            name="district"
            value={fields.district}
            error={errors.district}
            onChange={(v) => set("district", v)}
            className="sm:col-span-2"
          />
          <Field
            label="Cidade"
            name="city"
            autoComplete="address-level2"
            value={fields.city}
            error={errors.city}
            onChange={(v) => set("city", v)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.15em]">
              Estado
            </span>
            <select
              name="state"
              autoComplete="address-level1"
              value={fields.state}
              onChange={(e) => set("state", e.target.value)}
              aria-invalid={!!errors.state}
              className={`h-12 border bg-paper px-3 text-sm ${
                errors.state ? "border-red-700" : "border-line focus:border-ink"
              }`}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {errors.state && (
              <span className="text-xs text-red-700">{errors.state}</span>
            )}
          </label>
        </Section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">
            3. Pagamento
          </h2>
          <fieldset className="mt-5">
            <legend className="sr-only">Forma de pagamento</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => (
                <label
                  key={key}
                  className={`flex h-14 cursor-pointer items-center gap-3 border px-4 text-sm transition-colors ${
                    payment === key ? "border-ink" : "border-line hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={key}
                    checked={payment === key}
                    onChange={() => {
                      setPayment(key);
                      setErrors((e) => ({ ...e, paymentMethod: undefined }));
                    }}
                    className="size-4 accent-ink"
                  />
                  {PAYMENT_METHODS[key]}
                </label>
              ))}
            </div>
            {errors.paymentMethod && (
              <p className="mt-2 text-xs text-red-700">{errors.paymentMethod}</p>
            )}
          </fieldset>
          <p className="mt-4 border border-line px-4 py-3 text-xs leading-relaxed text-muted">
            O pagamento online ainda não está disponível. Ao confirmar, seu pedido
            fica registrado como <strong className="text-ink">aguardando pagamento</strong>{" "}
            e nenhum valor é cobrado agora.
          </p>
        </section>
      </div>

      <aside className="md:sticky md:top-24 md:self-start">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">
          Resumo do pedido
        </h2>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-3 py-4">
              <div className="relative aspect-[4/5] w-16 shrink-0 bg-mist">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <ShirtPlaceholder />
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium uppercase tracking-[0.1em]">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Tamanho {item.size} · {item.quantity}{" "}
                  {item.quantity === 1 ? "unidade" : "unidades"}
                </p>
              </div>
              <p className="text-sm tabular-nums">
                {formatPrice(item.priceCents * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Frete</dt>
            <dd className="text-muted">Não calculado</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
            <dt className="uppercase tracking-[0.2em]">Total</dt>
            <dd className="text-lg tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">Valor dos produtos, sem frete.</p>

        {notice && (
          <p role="status" className="mt-5 border border-line px-4 py-3 text-xs">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !quoted}
          className="mt-6 flex h-12 w-full items-center justify-center bg-ink text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Enviando…" : !quoted ? "Conferindo itens…" : "Confirmar pedido"}
        </button>

        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 min-h-5 text-sm text-red-700"
        >
          {message}
        </p>

        <Link
          href="/carrinho"
          className="mt-1 inline-block text-xs uppercase tracking-[0.15em] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Voltar ao carrinho
        </Link>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em]">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
} & Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "autoComplete" | "placeholder" | "readOnly"
>;

function Field({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  className = "",
  ref,
  type = "text",
  ...rest
}: FieldProps) {
  const describedBy = error || hint ? `${name}-msg` : undefined;
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium uppercase tracking-[0.15em]">{label}</span>
      <input
        ref={ref}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`h-12 border px-3 text-sm outline-none placeholder:text-[#b5b5b5] read-only:bg-mist read-only:text-muted ${
          error ? "border-red-700" : "border-line focus:border-ink"
        }`}
        {...rest}
      />
      {(error || hint) && (
        <span
          id={describedBy}
          className={`text-xs ${error ? "text-red-700" : "text-muted"}`}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}
