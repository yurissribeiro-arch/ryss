/** Substitui {nome} e {primeiro_nome} numa mensagem (usado no navegador e no servidor). */
export function fillTemplate(text: string, customer: { full_name: string }) {
  const first = customer.full_name.split(" ")[0] ?? "";
  return text.replaceAll("{primeiro_nome}", first).replaceAll("{nome}", customer.full_name);
}
