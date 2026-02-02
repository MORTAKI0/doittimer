import { getDashboardPomodoroStats, getDashboardTodayStats } from "@/app/actions/dashboard";
import { Card } from "@/components/ui/card";
import { IconCheck, IconFocus, IconPulse, IconTrophy, IconSparkles } from "@/components/ui/icons";

function formatFocusTime(totalSeconds: number) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getRankingBadgeClass(rank: number): string {
  if (rank === 1) return "ranking-badge ranking-badge-1";
  if (rank === 2) return "ranking-badge ranking-badge-2";
  if (rank === 3) return "ranking-badge ranking-badge-3";
  return "ranking-badge ranking-badge-default";
}

export default async function DashboardPage() {
  const [statsResult, pomodoroStatsResult] = await Promise.all([
    getDashboardTodayStats(),
    getDashboardPomodoroStats(),
  ]);
  const stats = statsResult.success
    ? statsResult.data
    : {
      focus_seconds: 0,
      sessions_count: 0,
      tasks_total: 0,
      tasks_completed: 0,
    };
  const pomodoroStats = pomodoroStatsResult.success
    ? pomodoroStatsResult.data
    : {
      total_work_completed_today: 0,
      top_tasks_today: [],
    };
  const showEmptyFocusHint =
    statsResult.success && stats.focus_seconds === 0 && stats.sessions_count === 0;
  const showEmptyTasksHint = statsResult.success && stats.tasks_total === 0;

  // Calculate max pomodoros for progress bar scaling
  const maxPomodoros = pomodoroStats.top_tasks_today.length > 0
    ? Math.max(...pomodoroStats.top_tasks_today.map((t) => t.pomodoros))
    : 1;

  // Calculate task completion percentage
  const taskCompletionPercent = stats.tasks_total > 0
    ? Math.round((stats.tasks_completed / stats.tasks_total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="dashboard-header">
        <h1 className="text-3xl font-bold gradient-text animate-fade-in">Dashboard</h1>
        <p className="mt-2 text-muted-foreground animate-fade-in delay-100 opacity-0">
          Track your focus sessions and tasks for today.
        </p>
      </div>

      {/* Error Messages */}
      {!statsResult.success && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {statsResult.error}
        </p>
      )}

      {!pomodoroStatsResult.success && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {pomodoroStatsResult.error}
        </p>
      )}

      {/* Stat Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Focus Time Card */}
        <Card variant="glass" className="stat-card animate-fade-in-up opacity-0 delay-100">
          <div className="flex items-start justify-between">
            <div className="stat-card-icon">
              <IconFocus className="h-7 w-7" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Focus Today
            </span>
          </div>
          <p className="stat-value mt-4">{formatFocusTime(stats.focus_seconds)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Total time focused</p>
        </Card>

        {/* Sessions Card */}
        <Card variant="glass" className="stat-card animate-fade-in-up opacity-0 delay-200">
          <div className="flex items-start justify-between">
            <div className="stat-card-icon">
              <IconPulse className="h-7 w-7" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions
            </span>
          </div>
          <p className="stat-value mt-4">{stats.sessions_count}</p>
          <p className="mt-2 text-sm text-muted-foreground">Focus sessions completed</p>
        </Card>

        {/* Tasks Completed Card */}
        <Card variant="glass" className="stat-card animate-fade-in-up opacity-0 delay-300">
          <div className="flex items-start justify-between">
            <div className="stat-card-icon">
              <IconCheck className="h-7 w-7" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tasks Done
            </span>
          </div>
          <p className="stat-value mt-4">
            {stats.tasks_completed}
            <span className="text-lg text-muted-foreground font-normal"> / {stats.tasks_total}</span>
          </p>
          <div className="mt-3">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${taskCompletionPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{taskCompletionPercent}% complete</p>
          </div>
        </Card>

        {/* Pomodoros Card */}
        <Card variant="glass" className="stat-card animate-fade-in-up opacity-0 delay-400">
          <div className="flex items-start justify-between">
            <div className="stat-card-icon">
              <IconPulse className="h-7 w-7" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pomodoros
            </span>
          </div>
          <p className="stat-value mt-4">{pomodoroStats.total_work_completed_today}</p>
          <p className="mt-2 text-sm text-muted-foreground">Work sessions today</p>
        </Card>
      </div>

      {/* Empty Focus Hint */}
      {showEmptyFocusHint && (
        <Card variant="glass" className="animate-fade-in-up opacity-0 delay-500">
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconFocus className="h-10 w-10" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No sessions yet today</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Start your first focus session to begin tracking your productivity and building momentum.
            </p>
          </div>
        </Card>
      )}

      {/* Empty Tasks Hint */}
      {showEmptyTasksHint && (
        <Card variant="glass" className="animate-fade-in-up opacity-0 delay-500">
          <div className="empty-state">
            <div className="empty-state-icon">
              <IconSparkles className="h-10 w-10" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No tasks yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first task to start organizing your work and tracking your progress.
            </p>
          </div>
        </Card>
      )}

      {/* Top Tasks Section */}
      <Card variant="glow" className="animate-fade-in-up opacity-0 delay-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="stat-card-icon" style={{ width: 48, height: 48 }}>
            <IconTrophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Top Tasks Today</h2>
            <p className="text-sm text-muted-foreground">Your most active tasks</p>
          </div>
        </div>

        {pomodoroStats.top_tasks_today.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No task-linked pomodoros yet today. Link a task to your next focus session!
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {pomodoroStats.top_tasks_today.map((task, index) => {
              const progressPercent = Math.round((task.pomodoros / maxPomodoros) * 100);
              return (
                <li key={task.task_id} className="task-list-item">
                  <span className={getRankingBadgeClass(index + 1)}>{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-foreground">{task.task_title}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="progress-bar-container flex-1">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                        {task.pomodoros}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
