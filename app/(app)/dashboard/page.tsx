import { getDashboardTodayStats } from "@/app/actions/dashboard";
import { Card } from "@/components/ui/card";

function formatFocusTime(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default async function DashboardPage() {
  const statsResult = await getDashboardTodayStats();
  const stats = statsResult.success
    ? statsResult.data
    : {
        focus_seconds: 0,
        sessions_count: 0,
        tasks_total: 0,
        tasks_completed: 0,
      };
  const showEmptyFocusHint =
    statsResult.success && stats.focus_seconds === 0 && stats.sessions_count === 0;
  const showEmptyTasksHint = statsResult.success && stats.tasks_total === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Track your focus sessions and tasks for today.
        </p>
      </div>

      {!statsResult.success ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {statsResult.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Focus today
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatFocusTime(stats.focus_seconds)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sessions today
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.sessions_count}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Tasks completed
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {stats.tasks_completed} / {stats.tasks_total}
          </p>
        </Card>
      </div>

      {showEmptyFocusHint ? (
        <Card className="border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          No sessions yet today. Start one from Focus to begin.
        </Card>
      ) : null}

      {showEmptyTasksHint ? (
        <p className="text-sm text-zinc-500">No tasks yet. Create one in Tasks.</p>
      ) : null}
    </div>
  );
}
