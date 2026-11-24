"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { logCustomerMessage } from "@/app/admin/crm-actions";
import { maskPhone } from "@/lib/br";
import { fillTemplate } from "@/lib/crm-template";
import type { Template } from "./CustomerTools";
import { input } from "./styles";

type Customer = { id: string; full_name: string; email: string; phone: string };

/**
 * Lista do público com envio individual: escolha um modelo e clique em cada
 * cliente para abrir o WhatsApp/e-mail com a mensagem personalizada.
 */
export function AudienceList({
  customers,
  total,
  templates,
}: {
  customers: Customer[];
  total: number;
  templates: Template[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const template = templates.find((t) => t.id === templateId);

  function send(c: Customer) {
    if (!template) return;
    const body = fillTemplate(template.body, c);
    const subject = fillTemplate(template.subject, c);
    const url =
      template.channel === "whatsapp"
        ? `https://wa.me/55${c.phone}?text=${encodeURIComponent(body)}`
        : `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent((s) => new Set(s).add(c.id));
    startTransition(async () => {
      await logCustomerMessage({ customerId: c.id, channel: template.channel, subject, body });
    });
  }

  if (customers.length === 0) {
    return (
      <p className="border border-line bg-paper px-4 py-10 text-center text-sm text-muted">
        Nenhum cliente neste público.
      </p>
    );
  }

  return (
    <div className="border border-line bg-paper">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 text-sm">
        {templates.length === 0 ? (
          <p className="text-muted">
            Crie um modelo em{" "}
            <Link href="/admin/marketing/modelos" className="underline underline-offset-4">
              Modelos de mensagem
            </Link>{" "}
            para enviar.
          </p>
        ) : (
          <>
            <label htmlFor="modelo" className="text-xs uppercase tracking-[0.12em]">
              Modelo
            </label>
            <select
              id="modelo"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={`${input} min-w-60`}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel === "whatsapp" ? "WhatsApp" : "E-mail"})
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Enviados nesta tela: {sent.size}
            </span>
          </>
        )}
      </div>
      <ul className="divide-y divide-line">
        {customers.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <Link href={`/admin/clientes/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                {c.full_name}
              </Link>
              <p className="text-xs text-muted">
                {maskPhone(c.phone)} · {c.email}
              </p>
            </div>
            <button
              type="button"
              disabled={!template}
              onClick={() => send(c)}
              className={`h-8 border px-3 text-xs disabled:opacity-40 ${
                sent.has(c.id) ? "border-green-700 text-green-700" : "border-line hover:border-ink"
              }`}
            >
              {sent.has(c.id) ? "Enviado ✓" : template?.channel === "email" ? "Abrir e-mail" : "Abrir WhatsApp"}
            </button>
          </li>
        ))}
      </ul>
      {total > customers.length && (
        <p className="border-t border-line px-4 py-3 text-xs text-muted">
          Mostrando {customers.length} de {total}. Use os filtros ou exporte a lista completa.
        </p>
      )}
    </div>
  );
}
