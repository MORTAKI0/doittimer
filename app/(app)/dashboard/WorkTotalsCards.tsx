import { Card } from "@/components/ui/card";

type WorkTotalsCardsProps = {
  today: string;
  week: string;
  month: string;
};

/** Focused-time buckets shown on dashboard entry. */
export function WorkTotalsCards({ today, week, month }: WorkTotalsCardsProps) {
  const items = [
    {
      label: "Today",
      value: today,
      detail: "Focused time in your current timezone day.",
      accent: true,
    },
    {
      label: "This week",
      value: week,
      detail: "Running total for the current week.",
      accent: false,
    },
    {
      label: "This month",
      value: month,
      detail: "Longer-view trend of deep work volume.",
      accent: false,
    },
  ] as const;

  return (
    <div className="animate-fadeIn stagger-2 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
      {items.map((item) => (
        <Card
          key={item.label}
          className={[
            "space-y-2 p-5",
            item.accent
              ? "border-emerald-200/70 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.9))]"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="text-overline">{item.label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
          <p className="max-w-[22rem] text-sm text-muted-foreground">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}
