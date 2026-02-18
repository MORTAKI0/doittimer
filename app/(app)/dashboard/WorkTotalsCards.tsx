import { Card } from "@/components/ui/card";

type WorkTotalsCardsProps = {
  today: string;
  week: string;
  month: string;
};

/** Focused-time buckets shown on dashboard entry. */
export function WorkTotalsCards({ today, week, month }: WorkTotalsCardsProps) {
  const items = [
    { label: "Today", value: today },
    { label: "This week", value: week },
    { label: "This month", value: month },
  ] as const;

  return (
    <div className="animate-fadeInUp stagger-2 grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="space-y-1 p-4">
          <p className="text-overline">{item.label}</p>
          <p className="text-2xl font-semibold text-foreground">{item.value}</p>
          <p className="text-xs text-muted-foreground">Focused time</p>
        </Card>
      ))}
    </div>
  );
}
