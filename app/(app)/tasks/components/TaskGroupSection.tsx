import * as React from "react";

type TaskGroupSectionProps = {
  title: string;
  tone?: "default" | "overdue";
  children: React.ReactNode;
};

export function TaskGroupSection({
  title,
  tone = "default",
  children,
}: TaskGroupSectionProps) {
  return (
    <section className="space-y-0">
      <div
        className={[
          "border-b-[0.5px] border-border py-[12px] pb-[6px] text-[13px] font-semibold",
          tone === "overdue" ? "text-due-overdue" : "text-muted-foreground",
        ].join(" ")}
      >
        {title}
      </div>
      {children}
    </section>
  );
}
