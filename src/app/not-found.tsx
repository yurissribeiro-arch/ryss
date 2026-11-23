import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-24 text-center md:px-8">
      <h1 className="text-sm font-semibold uppercase tracking-[0.28em]">
        Página não encontrada
      </h1>
      <p className="mt-3 text-sm text-muted">
        O produto ou a página que você procura não está disponível.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center bg-ink px-8 text-sm font-medium uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-85"
      >
        Ver produtos
      </Link>
    </div>
  );
}
