"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";
import { btn, input } from "./styles";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-[0.15em]">
        E-mail
        <input name="email" type="email" autoComplete="username" required className={`${input} w-full`} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-[0.15em]">
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${input} w-full`}
        />
      </label>
      <button type="submit" disabled={pending} className={`${btn} mt-2 h-11`}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p role="alert" className="min-h-5 text-center text-sm text-red-700">
        {state?.message}
      </p>
    </form>
  );
}
