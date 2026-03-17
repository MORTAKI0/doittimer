import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

type TaskPageHeaderProps = {
  title: string;
  description?: string;
  count?: number;
  secondaryLabel?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function TaskPageHeader({
  title,
  description,
  count,
  secondaryLabel,
  actionHref,
  actionLabel,
}: TaskPageHeaderProps) {
  return (
    <div className="space-y-2 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-page-title text-foreground">{title}</h1>
            {typeof count === "number" ? (
              <span className="text-muted-ui numeric-tabular">{count}</span>
            ) : null}
          </div>
          {secondaryLabel ? (
            <p className="text-sm text-muted-foreground">{secondaryLabel}</p>
          ) : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
