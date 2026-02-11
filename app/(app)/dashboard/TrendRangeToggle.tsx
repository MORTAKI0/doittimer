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
    <div className="border-border bg-muted/30 inline-flex rounded-xl border p-1">
      <Link
        href={hrefForDays(7)}
        className={buttonStyles({
          size: "sm",
          variant: currentDays === 7 ? "primary" : "ghost",
          className: "h-8 rounded-lg px-3 text-xs",
        })}
      >
        7 days
      </Link>
      <Link
        href={hrefForDays(30)}
        className={buttonStyles({
          size: "sm",
          variant: currentDays === 30 ? "primary" : "ghost",
          className: "h-8 rounded-lg px-3 text-xs",
        })}
      >
        30 days
      </Link>
    </div>
  );
}
