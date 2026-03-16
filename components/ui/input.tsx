import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const inputStyles =
  "focus-ring ui-hover h-10 w-full rounded-md border-[0.5px] border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={[
          inputStyles,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
  },
);
