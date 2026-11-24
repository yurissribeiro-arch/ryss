import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/form";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Destino dos links enviados por e-mail (confirmar conta e redefinir senha).
 * Troca o código do link por uma sessão e segue para a página indicada.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/conta");

  if (code) {
    const supabase = await createSessionClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {
      error: new Error("config"),
    };
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/conta/entrar?erro=link", url.origin));
}
