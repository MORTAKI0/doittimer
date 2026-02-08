import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="group inline-flex items-center gap-3 text-foreground">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
        DT
      </span>
      <span className="text-lg font-semibold tracking-tight transition-colors group-hover:text-emerald-700">
        DoItTimer
      </span>
    </Link>
  );
}
