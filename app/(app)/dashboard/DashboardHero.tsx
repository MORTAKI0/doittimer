import { IconCalendar } from "@/components/ui/icons";

type DashboardHeroProps = {
  greeting: string;
  userLabel: string;
  dateLabel: string;
  focusLabel: string;
};

export function DashboardHero({
  greeting,
  userLabel,
  dateLabel,
  focusLabel,
}: DashboardHeroProps) {
  return (
    <section className="dashboard-hero">
      <div className="space-y-3">
        <h1 className="dashboard-hero-title">
          {greeting},{" "}
          <span className="text-emerald-700">{userLabel}.</span>
        </h1>
      </div>
      <div className="dashboard-hero-subtitle">
        <span className="dashboard-hero-subtitle-icon" aria-hidden="true">
          <IconCalendar size={16} />
        </span>
        <div className="dashboard-hero-subtitle-copy">
          <span>{dateLabel}</span>
          <span aria-hidden="true">-</span>
          <span>{focusLabel}</span>
        </div>
      </div>
    </section>
  );
}
