import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";

type KpiCardProps = {
  label: string;
  tooltip: string;
  value: string | number;
  href: string;
  helperText?: string;
};

export function KpiCard({ label, tooltip, value, href, helperText }: KpiCardProps) {
  return (
    <Link href={href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[var(--radius-md)]">
      <Card variant="interactive" className="h-full space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Tooltip label={tooltip} />
        </div>
        <p className="numeric-tabular text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {helperText ? <p className="text-meta">{helperText}</p> : null}
      </Card>
    </Link>
  );
}
