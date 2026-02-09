import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex min-h-[180px] flex-col items-start justify-center gap-3 rounded-[var(--radius-md)] border border-dashed border-border bg-muted/25 px-5 py-6",
        className,
      ].filter(Boolean).join(" ")}
    >
      <p className="text-card-title text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={buttonStyles({ size: "sm", variant: "secondary" })}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
