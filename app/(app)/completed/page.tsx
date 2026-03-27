import Link from "next/link";

import { getProjects } from "@/app/actions/projects";
import { getCompletedTasks } from "@/app/actions/tasks";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CompletedTaskList } from "@/app/(app)/tasks/components/CompletedTaskList";
import { TaskGroupSection } from "@/app/(app)/tasks/components/TaskGroupSection";
import { TaskPageHeader } from "@/app/(app)/tasks/components/TaskPageHeader";

export const revalidate = 60;

type SearchParams = Promise<{
  project?: string;
}>;

function formatCompletedGroupTitle(dateOnly: string) {
  const date = new Date(`${dateOnly}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const normalized = date.toISOString().slice(0, 10);
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const yesterdayKey = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString().slice(0, 10);
  const relative = normalized === todayKey ? "Today" : normalized === yesterdayKey ? "Yesterday" : "";

  const datePart = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);

  return relative ? `${datePart} · ${relative} · ${weekday}` : `${datePart} · ${weekday}`;
}

export default async function CompletedPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const projectId = typeof searchParams.project === "string" && searchParams.project.trim() !== ""
    ? searchParams.project
    : null;

  const [completedResult, projectsResult] = await Promise.all([
    getCompletedTasks(projectId),
    getProjects(),
  ]);

  const projects = projectsResult.success ? projectsResult.data.filter((project) => !project.archived_at) : [];
  const error = completedResult.success ? null : completedResult.error;
  const tasks = completedResult.success ? completedResult.data.tasks : [];
  const groups = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
    const key = task.completed_at?.slice(0, 10);
    if (!key) return acc;
    acc[key] = acc[key] ? [...acc[key], task] : [task];
    return acc;
  }, {});

  return (
    <div className="page-content-column space-y-6">
      <TaskPageHeader
        title="Completed"
        count={tasks.length}
        description="Recently completed tasks grouped by finish date."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/completed"
          className={buttonStyles({ size: "sm", variant: projectId ? "secondary" : "primary" })}
        >
          All projects
        </Link>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/completed?project=${project.id}`}
            className={buttonStyles({ size: "sm", variant: projectId === project.id ? "primary" : "secondary" })}
          >
            {project.name}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No completed tasks yet"
          description="Completed work will appear here once tasks are checked off."
          actionHref="/today"
          actionLabel="Plan today"
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([dateKey, groupTasks]) => (
            <TaskGroupSection key={dateKey} title={formatCompletedGroupTitle(dateKey)}>
              <CompletedTaskList tasks={groupTasks} projects={projects} />
            </TaskGroupSection>
          ))}
        </div>
      )}
    </div>
  );
}
