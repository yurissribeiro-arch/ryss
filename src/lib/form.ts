/** Resposta padrão das Server Actions de formulários. */
export type FormState = { ok: boolean; message: string } | null;

export const ok = (message: string): FormState => ({ ok: true, message });
export const fail = (message: string): FormState => ({ ok: false, message });

/** Lê um campo de texto do FormData (sempre string, sem espaços nas pontas). */
export function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

/** Primeira mensagem de erro de uma validação zod. */
export function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

/** Destino interno seguro para redirecionamentos (evita mandar para outro site). */
export function safeNext(value: string | null | undefined, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
