import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { default: "Painel", template: `%s | Painel ${site.name}` },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-[#fafafa]">{children}</div>;
}
