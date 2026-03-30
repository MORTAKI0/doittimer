import { getLabels } from "@/app/actions/labels";
import { getProjects } from "@/app/actions/projects";
import { getActiveSession } from "@/app/actions/sessions";
import { getTodayTasks } from "@/app/actions/tasks";
import { EmptyState } from "@/components/ui/empty-state";
import { AddTaskLauncher } from "@/app/(app)/tasks/components/AddTaskLauncher";
import { TaskComposeOwner } from "@/app/(app)/tasks/components/TaskComposeOwner";
import { TaskGroupSection } from "@/app/(app)/tasks/components/TaskGroupSection";
import { TaskList } from "@/app/(app)/tasks/components/TaskList";
import { TaskPageHeader } from "@/app/(app)/tasks/components/TaskPageHeader";

function formatTodayLabel(dateOnly: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateOnly}T00:00:00`));
}

export default async function TodayPage() {
  const [todayResult, projectsResult, labelsResult, activeSession] = await Promise.all([
    getTodayTasks(),
    getProjects(),
    getLabels(),
    getActiveSession(),
  ]);

  const projects = projectsResult.success ? projectsResult.data.filter((project) => !project.archived_at) : [];
  const availableLabels = labelsResult.success ? labelsResult.data : [];
  const error = todayResult.success ? null : todayResult.error;
  const today = todayResult.success ? todayResult.data.today : "";
  const tasks = todayResult.success ? todayResult.data.tasks : [];
  const overdueTasks = tasks.filter((task) => task.scheduled_for && task.scheduled_for < today);
  const todayTasks = tasks.filter((task) => task.scheduled_for === today);
  const inboxTasks = todayTasks.filter((task) => !task.project_id);
  const projectGroups = projects
    .map((project) => ({
      id: project.id,
      name: project.name,
      tasks: todayTasks.filter((task) => task.project_id === project.id),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <TaskComposeOwner projects={projects} defaultScheduledFor={today || null}>
      <div className="page-content-column space-y-6">
        <TaskPageHeader
          title="Today"
          count={tasks.length}
          secondaryLabel={today ? formatTodayLabel(today) : undefined}
          action={<AddTaskLauncher projects={projects} defaultScheduledFor={today || null} />}
        />

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="Nothing scheduled for today"
            description="Tasks due today and overdue work will appear here."
            action={<AddTaskLauncher projects={projects} defaultScheduledFor={today || null} label="Create task" />}
          />
        ) : (
          <div className="space-y-6">
            {overdueTasks.length > 0 ? (
              <TaskGroupSection title="Overdue" tone="overdue">
                <TaskList tasks={overdueTasks} availableLabels={availableLabels} projects={projects} activeSession={activeSession} showQueueSection={false} showListHeader={false} inlineCreateDefaultScheduledFor={today} />
              </TaskGroupSection>
            ) : null}

            {inboxTasks.length > 0 ? (
              <TaskGroupSection title="Inbox">
                <TaskList tasks={inboxTasks} availableLabels={availableLabels} projects={projects} activeSession={activeSession} showQueueSection={false} showListHeader={false} inlineCreateDefaultScheduledFor={today} />
              </TaskGroupSection>
            ) : null}

            {projectGroups.map((group) => (
              <TaskGroupSection key={group.id} title={group.name}>
                <TaskList tasks={group.tasks} availableLabels={availableLabels} projects={projects} activeSession={activeSession} showQueueSection={false} showListHeader={false} inlineCreateDefaultScheduledFor={today} inlineCreateDefaultProjectId={group.id} />
              </TaskGroupSection>
            ))}
          </div>
        )}
      </div>
    </TaskComposeOwner>
  );
}
