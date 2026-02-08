import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-muted",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
