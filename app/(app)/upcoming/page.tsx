import Link from "next/link";

import { getProjects } from "@/app/actions/projects";
import { getUpcomingTasks } from "@/app/actions/tasks";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskGroupSection } from "@/app/(app)/tasks/components/TaskGroupSection";
import { TaskList } from "@/app/(app)/tasks/components/TaskList";
import { TaskPageHeader } from "@/app/(app)/tasks/components/TaskPageHeader";

function formatDateKey(dateOnly: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateOnly}T00:00:00`));
}

export default async function UpcomingPage() {
  const [upcomingResult, projectsResult] = await Promise.all([
    getUpcomingTasks(7),
    getProjects(),
  ]);

  const projects = projectsResult.success ? projectsResult.data.filter((project) => !project.archived_at) : [];
  const error = upcomingResult.success ? null : upcomingResult.error;
  const tasks = upcomingResult.success ? upcomingResult.data.tasks : [];
  const startDate = upcomingResult.success ? upcomingResult.data.startDate : "";
  const weekDays = upcomingResult.success
    ? Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${startDate}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + index);
      const dateOnly = date.toISOString().slice(0, 10);
      return {
        id: dateOnly,
        shortLabel: new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric" }).format(date),
      };
    })
    : [];
  const groups = weekDays
    .map((day) => ({
      ...day,
      tasks: tasks.filter((task) => task.scheduled_for === day.id),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <div className="page-content-column space-y-6">
      <TaskPageHeader
        title="Upcoming"
        count={tasks.length}
        description="The next seven days of scheduled work."
        actionHref="/tasks?compose=1"
        actionLabel="Add task"
      />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : (
        <>
          <div className="flex items-center gap-2 overflow-x-auto border-b-[0.5px] border-border pb-3">
            <Link href="/today" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Today
            </Link>
            {weekDays.map((day) => (
              <a
                key={day.id}
                href={`#date-${day.id}`}
                className={[
                  "whitespace-nowrap border-b-2 px-1 pb-1 text-sm transition-colors",
                  day.id === startDate
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {day.shortLabel}
              </a>
            ))}
          </div>

          {groups.length === 0 ? (
            <EmptyState
              title="Nothing upcoming"
              description="Future scheduled tasks will collect here over the next seven days."
              actionHref="/tasks?compose=1"
              actionLabel="Create task"
            />
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.id} id={`date-${group.id}`}>
                  <TaskGroupSection title={formatDateKey(group.id)}>
                    <TaskList tasks={group.tasks} projects={projects} showQueueSection={false} showListHeader={false} inlineCreateDefaultScheduledFor={group.id} />
                  </TaskGroupSection>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
