import * as React from "react";

type ProgressRingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  indicatorClassName?: string;
  className?: string;
  label?: string;
  children?: React.ReactNode;
};

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  trackClassName,
  indicatorClassName,
  className,
  label,
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className={["relative inline-flex items-center justify-center", className].filter(Boolean).join(" ")}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={trackClassName ?? "stroke-border"}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          className={indicatorClassName ?? "stroke-emerald-500"}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 220ms var(--ease-standard)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
        {label ? <span className="sr-only">{label}</span> : null}
      </div>
    </div>
  );
}
