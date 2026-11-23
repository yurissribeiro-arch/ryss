import Image from "next/image";
import { site } from "@/config/site";

type Props = {
  variant?: "black" | "white";
  className?: string;
  priority?: boolean;
};

/** Logo oficial. Sem arquivo configurado, exibe o nome da marca em texto. */
export function Logo({ variant = "black", className, priority }: Props) {
  const src = site.logo[variant];

  if (src) {
    return (
      <Image
        src={src}
        alt={site.name}
        width={site.logo.width}
        height={site.logo.height}
        priority={priority}
        className={className}
        style={{ height: "auto" }}
      />
    );
  }

  return (
    <span
      className={`text-base font-semibold uppercase tracking-[0.28em] ${
        variant === "white" ? "text-paper" : "text-ink"
      } ${className ?? ""}`}
    >
      {site.name}
    </span>
  );
}
