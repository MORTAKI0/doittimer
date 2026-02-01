import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 text-zinc-900 group">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 group-hover:shadow-emerald-500/50 group-hover:scale-105">
        <span className="relative z-10">DT</span>
        <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 to-white/20" />
      </span>
      <span className="text-lg font-bold tracking-tight transition-colors group-hover:text-emerald-600">
        DoItTimer
      </span>
    </Link>
  );
}
