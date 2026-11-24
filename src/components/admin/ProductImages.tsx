"use client";

import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  addProductImage,
  deleteProductImage,
  reorderImages,
  updateImageAlt,
} from "@/app/admin/actions";
import { btnOutline } from "./styles";

type Img = { id: string; url: string; alt: string };

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_BYTES = 10 * 1024 * 1024;

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export function ProductImages({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList) {
    setError(null);
    const supabase = browserClient();
    const list = Array.from(files);
    for (const [i, file] of list.entries()) {
      const ext = TYPES[file.type];
      if (!ext) {
        setError(`"${file.name}": use JPG, PNG, WEBP ou AVIF.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" tem mais de 10 MB.`);
        continue;
      }
      setUploading(`Enviando ${i + 1} de ${list.length}…`);
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: upError } = await supabase.storage
        .from("products")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upError) {
        setError(`Falha ao enviar "${file.name}": ${upError.message}`);
        continue;
      }
      const result = await addProductImage(productId, path);
      if (!result.ok) setError(result.message);
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message ?? "Erro.");
      router.refresh();
    });
  }

  function move(index: number, delta: number) {
    const ids = images.map((i) => i.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderImages(productId, ids));
  }

  const busy = pending || uploading !== null;

  return (
    <section className="border border-line bg-paper p-5 md:p-6">
      <h2 className="text-xs font-medium uppercase tracking-[0.12em]">Fotos</h2>
      <p className="mt-1 text-xs text-muted">
        A primeira foto é a capa na vitrine. Proporção ideal: vertical 4:5 (ex.: 1600×2000).
      </p>

      {images.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {images.map((img, i) => (
            <li key={img.id} className="flex flex-col gap-2">
              <div className="relative aspect-[4/5] bg-mist">
                {img.url && (
                  <Image src={img.url} alt={img.alt} fill sizes="180px" className="object-cover" />
                )}
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 bg-ink px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-paper">
                    Capa
                  </span>
                )}
              </div>
              <input
                aria-label="Descrição da foto"
                placeholder="Descrição (acessibilidade)"
                defaultValue={img.alt}
                maxLength={200}
                onBlur={(e) => {
                  if (e.target.value !== img.alt) run(() => updateImageAlt(img.id, e.target.value));
                }}
                className="h-8 w-full border border-line px-2 text-xs outline-none focus:border-ink"
              />
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Mover para a esquerda"
                  className="h-7 w-7 border border-line hover:border-ink disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={busy || i === images.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Mover para a direita"
                  className="h-7 w-7 border border-line hover:border-ink disabled:opacity-30"
                >
                  →
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Remover esta foto?")) run(() => deleteProductImage(img.id));
                  }}
                  className="ml-auto text-muted underline-offset-4 hover:text-red-700 hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nenhuma foto ainda.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        id="upload-fotos"
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
        disabled={busy}
      />
      <label
        htmlFor="upload-fotos"
        className={`${btnOutline} mt-4 w-full cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}
      >
        {uploading ?? "+ Enviar fotos"}
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
