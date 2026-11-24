"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/admin";
import { btn } from "./styles";

export function OrderStatusForm({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [value, setValue] = useState<OrderStatus>(status);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "cancelado") {
    return (
      <section className="border border-line bg-paper px-5 py-4 text-sm text-muted">
        Pedido cancelado. O estoque dos itens já foi devolvido.
      </section>
    );
  }

  return (
    <section className="border border-line bg-paper px-5 py-4 text-sm">
      <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Alterar situação</h2>
      <select
        aria-label="Nova situação"
        value={value}
        onChange={(e) => {
          setValue(e.target.value as OrderStatus);
          setMessage(null);
        }}
        className="mt-3 h-10 w-full border border-line bg-paper px-3 text-sm"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {value === "cancelado" && (
        <p className="mt-2 text-xs text-red-700">
          Cancelar devolve as peças ao estoque e não pode ser desfeito.
        </p>
      )}
      <button
        type="button"
        disabled={pending || value === status}
        className={`${btn} mt-3 w-full`}
        onClick={() => {
          if (value === "cancelado" && !window.confirm("Cancelar este pedido?")) return;
          startTransition(async () => {
            const result = await setOrderStatus(orderId, value);
            setMessage(
              result.ok
                ? { ok: true, text: "Situação atualizada." }
                : { ok: false, text: result.message },
            );
            router.refresh();
          });
        }}
      >
        {pending ? "Salvando…" : "Salvar situação"}
      </button>
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        Não há pagamento online ainda: marque como “Pago” somente depois de confirmar o recebimento.
      </p>
    </section>
  );
}
