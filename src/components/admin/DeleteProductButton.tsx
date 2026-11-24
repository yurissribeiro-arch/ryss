"use client";

import { useState, useTransition } from "react";
import { deleteProduct } from "@/app/admin/actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Excluir "${name}" definitivamente, com fotos e tamanhos?\n\nPedidos antigos continuam com o nome do produto. Para só tirar da loja, desmarque "Mostrar na loja".`,
            )
          )
            return;
          startTransition(async () => {
            const result = await deleteProduct(id);
            if (result && !result.ok) setError(result.message);
          });
        }}
        className="text-sm text-red-700 underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? "Excluindo…" : "Excluir produto"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
