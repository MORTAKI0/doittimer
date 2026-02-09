import * as React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={[
        "shimmer rounded-xl",
        className,
      ].filter(Boolean).join(" ")}
      aria-hidden="true"
      {...props}
    />
  );
}
