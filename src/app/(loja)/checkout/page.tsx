import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
      <h1 className="mb-8 text-sm font-semibold uppercase tracking-[0.28em]">
        Finalizar compra
      </h1>
      <CheckoutForm />
    </div>
  );
}
