import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-foreground">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-sm ring-1 ring-emerald-700/30">
        DT
      </span>
      <span className="text-lg font-semibold tracking-tight">DoItTimer</span>
    </Link>
  );
}
