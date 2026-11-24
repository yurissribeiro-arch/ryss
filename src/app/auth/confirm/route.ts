import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/form";
import { createSessionClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["recovery", "signup", "invite", "email", "email_change"];

/**
 * Links com token (ex.: redefinição de senha gerada pelo painel).
 * Valida o token, abre a sessão e segue para a página indicada.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"), "/conta");

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSessionClient();
    const result = await supabase?.auth.verifyOtp({ type, token_hash: tokenHash });
    if (result && !result.error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/conta/entrar?erro=link", url.origin));
}
