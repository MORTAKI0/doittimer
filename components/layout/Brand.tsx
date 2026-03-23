import Link from "next/link";

type BrandProps = {
  variant?: "default" | "shell";
};

export function Brand({ variant = "default" }: BrandProps) {
  if (variant === "shell") {
    return (
      <Link href="/" className="app-shell-brand group">
        <span className="app-shell-brand-mark" aria-hidden="true">
          <span className="app-shell-brand-mark-inner">DT</span>
        </span>
        <span className="app-shell-brand-copy">
          <span className="app-shell-brand-title">DoItTimer</span>
          <span className="app-shell-brand-subtitle">Focus workspace</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className="group inline-flex items-center gap-3 text-foreground">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
        DT
      </span>
      <span className="flex flex-col">
        <span className="text-lg font-semibold tracking-tight transition-colors group-hover:text-emerald-700">
          DoItTimer
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700/65">
          Precision Focus
        </span>
      </span>
    </Link>
  );
}
