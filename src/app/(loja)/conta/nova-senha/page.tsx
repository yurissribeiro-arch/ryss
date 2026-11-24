import type { Metadata } from "next";
import { AuthCard } from "@/components/conta/AccountShell";
import { NewPasswordForm } from "@/components/conta/AuthForms";

export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false },
};

export default function NewPasswordPage() {
  return (
    <AuthCard title="Criar nova senha">
      <NewPasswordForm />
    </AuthCard>
  );
}
