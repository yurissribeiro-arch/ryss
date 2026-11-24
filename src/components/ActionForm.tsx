"use client";

import { useState, useTransition } from "react";
import type { FormState } from "@/lib/form";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  /** Pergunta de confirmação antes de enviar (ações irreversíveis). */
  confirmText?: string;
  /** Limpa os campos depois de salvar com sucesso (ex.: nova anotação). */
  resetOnSuccess?: boolean;
  className?: string;
  buttonClassName?: string;
  /** Campos extras escondidos (ex.: id do registro). */
  hidden?: Record<string, string>;
};

const DEFAULT_BUTTON =
  "inline-flex h-11 items-center justify-center bg-ink px-6 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60";

/**
 * Formulário que chama uma Server Action e mostra a resposta.
 * Não apaga o que foi digitado quando há erro.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Salvando…",
  confirmText,
  resetOnSuccess,
  className = "flex flex-col gap-4",
  buttonClassName = DEFAULT_BUTTON,
  hidden,
}: Props) {
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();
  // Trocar a chave recria os campos (limpa também campos controlados).
  const [formKey, setFormKey] = useState(0);

  return (
    <form
      key={formKey}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !window.confirm(confirmText)) return;
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await action(state, data);
          if (result?.ok && resetOnSuccess) setFormKey((k) => k + 1);
          setState(result);
        });
      }}
    >
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {state?.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
