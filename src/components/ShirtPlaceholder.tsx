export function ShirtPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <svg
        viewBox="0 0 64 64"
        className="w-1/3 text-[#d4d4d4]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M22 8l-12 6-6 14 9 4 3-6v32h28V26l3 6 9-4-6-14-12-6c-1 4-5 7-10 7s-9-3-10-7z" />
      </svg>
    </div>
  );
}
