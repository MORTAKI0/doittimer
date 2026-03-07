import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

type TrendRangeToggleProps = {
  currentDays: 7 | 30;
  hrefForDays: (days: 7 | 30) => string;
};

export function TrendRangeToggle({
  currentDays,
  hrefForDays,
}: TrendRangeToggleProps) {
  return (
    <div className="inline-flex rounded-2xl border border-border/80 bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <Link
        href={hrefForDays(7)}
        className={buttonStyles({
          size: "sm",
          variant: currentDays === 7 ? "primary" : "ghost",
          className: "h-8 rounded-xl px-3 text-xs",
        })}
      >
        7 days
      </Link>
      <Link
        href={hrefForDays(30)}
        className={buttonStyles({
          size: "sm",
          variant: currentDays === 30 ? "primary" : "ghost",
          className: "h-8 rounded-xl px-3 text-xs",
        })}
      >
        30 days
      </Link>
    </div>
  );
}
