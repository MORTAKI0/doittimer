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
};

export function KpiCard({ label, tooltip, value, href, helperText, icon, trendLabel }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--radius-md)] focus-ring"
    >
      <Card variant="interactive" className="h-full space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-emerald-600">{icon}</span> : null}
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <Tooltip label={tooltip} triggerLabel={`${label} help`} />
          </div>
          {trendLabel ? <span className="text-[11px] text-muted-foreground">{trendLabel}</span> : null}
        </div>
        <p className="numeric-tabular text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        {helperText ? <p className="text-meta">{helperText}</p> : null}
      </Card>
    </Link>
  );
}

