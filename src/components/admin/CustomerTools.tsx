"use client";

import { useState, useTransition } from "react";
import { generateResetLink, logCustomerMessage } from "@/app/admin/crm-actions";
import { fillTemplate } from "@/lib/crm-template";
import { btn, btnOutline, input } from "./styles";

export type Template = {
  id: string;
  name: string;
  channel: "whatsapp" | "email";
  subject: string;
  body: string;
};

/** Gera o link de redefinição de senha para copiar e enviar ao cliente. */
export function ResetLinkButton({ customerId }: { customerId: string }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        className={btnOutline}
        onClick={() =>
          startTransition(async () => {
            const r = await generateResetLink(customerId);
            setCopied(false);
            setResult(r.ok ? { ok: true, text: r.link } : { ok: false, text: r.message });
          })
        }
      >
        {pending ? "Gerando…" : "Gerar link de redefinição"}
      </button>
      {result && !result.ok && <p className="text-sm text-red-700">{result.text}</p>}
      {result?.ok && (
        <div className="flex flex-col gap-2">
          <input readOnly value={result.text} className={`${input} w-full text-xs`} onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className={btnOutline}
            onClick={async () => {
              await navigator.clipboard.writeText(result.text);
              setCopied(true);
            }}
          >
            {copied ? "Copiado ✓" : "Copiar link"}
          </button>
          <p className="text-xs text-muted">
            Envie ao cliente. O link vale por tempo limitado e funciona uma única vez.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Escreve uma mensagem (livre ou a partir de um modelo) e abre o WhatsApp ou o
 * e-mail com o texto pronto. O envio fica registrado no histórico do cliente.
 */
export function MessageComposer({
  customer,
  templates,
}: {
  customer: { id: string; full_name: string; email: string; phone: string };
  templates: Template[];
}) {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const available = templates.filter((t) => t.channel === channel);

  function open() {
    if (!body.trim()) {
      setStatus("Escreva a mensagem.");
      return;
    }
    const url =
      channel === "whatsapp"
        ? `https://wa.me/55${customer.phone}?text=${encodeURIComponent(body)}`
        : `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      const r = await logCustomerMessage({ customerId: customer.id, channel, subject, body });
      setStatus(r.ok ? "Registrado no histórico." : "Aberto, mas não foi possível registrar.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["whatsapp", "email"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`h-9 flex-1 border text-sm ${channel === c ? "border-ink bg-ink text-paper" : "border-line"}`}
          >
            {c === "whatsapp" ? "WhatsApp" : "E-mail"}
          </button>
        ))}
      </div>
      {available.length > 0 && (
        <select
          aria-label="Modelo"
          className={`${input} w-full`}
          defaultValue=""
          onChange={(e) => {
            const t = available.find((x) => x.id === e.target.value);
            if (!t) return;
            setSubject(fillTemplate(t.subject, customer));
            setBody(fillTemplate(t.body, customer));
          }}
        >
          <option value="">Usar um modelo…</option>
          {available.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      {channel === "email" && (
        <input
          aria-label="Assunto"
          placeholder="Assunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={`${input} w-full`}
        />
      )}
      <textarea
        aria-label="Mensagem"
        placeholder="Mensagem"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-ink"
      />
      <button type="button" onClick={open} className={btn}>
        Abrir {channel === "whatsapp" ? "WhatsApp" : "e-mail"}
      </button>
      {status && <p className="text-xs text-muted">{status}</p>}
    </div>
  );
}
