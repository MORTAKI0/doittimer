import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-zinc-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-xs font-semibold text-white">
        DT
      </span>
      <span className="text-lg font-semibold">DoItTimer</span>
    </Link>
  );
}
