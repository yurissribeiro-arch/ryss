import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 md:px-8 md:pb-24 md:pt-12">
      <h1 className="mb-8 text-sm font-semibold uppercase tracking-[0.28em]">
        Carrinho
      </h1>
      <CartView />
    </div>
  );
}
