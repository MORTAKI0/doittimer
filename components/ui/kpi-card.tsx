import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";

type KpiCardProps = {
  label: string;
  tooltip: string;
  value: string | number;
  href: string;
  helperText?: string;
  icon?: React.ReactNode;
  trendLabel?: string | null;
  variant?: "default" | "accent";
};

/** Compact KPI card with tooltip context and full-card navigation affordance. */
export function KpiCard({
  label,
  tooltip,
  value,
  href,
  helperText,
  icon,
  trendLabel,
  variant = "default",
}: KpiCardProps) {
  const isAccent = variant === "accent";

  return (
    <Link href={href} className="group block rounded-[var(--radius-md)] focus-ring">
      <Card
        variant="interactive"
        className={[
          "h-full space-y-3",
          isAccent
            ? "border-emerald-200/70 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))]"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className={isAccent ? "text-emerald-700" : "text-emerald-600"}>{icon}</span>
            ) : null}
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <Tooltip label={tooltip}>
              <span
                aria-label={`${label} help`}
                role="button"
                tabIndex={0}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground focus-ring"
              >
                i
              </span>
            </Tooltip>
          </div>
          {trendLabel ? <span className="text-[11px] text-muted-foreground">{trendLabel}</span> : null}
        </div>
        <p
          className={[
            "numeric-tabular text-3xl font-semibold tracking-tight",
            isAccent ? "text-emerald-950" : "text-foreground",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {value}
        </p>
        {helperText ? <p className="text-meta">{helperText}</p> : null}
      </Card>
    </Link>
  );
}
