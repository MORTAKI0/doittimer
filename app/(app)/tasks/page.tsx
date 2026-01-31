import { CreateTaskForm } from "./components/CreateTaskForm";
import { EmptyState } from "./components/EmptyState";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { TaskList } from "./components/TaskList";
import { getTaskPomodoroStats, getTasks } from "@/app/actions/tasks";
import { getTaskQueue } from "@/app/actions/queue";
import { getProjects } from "@/app/actions/projects";
import { Card } from "@/components/ui/card";

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string | null) {
  if (!message) return null;
  return ERROR_MAP[message] ?? message;
}

export default async function TasksPage() {
  const [tasksResult, projectsResult, queueResult] = await Promise.all([
    getTasks({ includeArchived: true }),
    getProjects({ includeArchived: true }),
    getTaskQueue(),
  ]);
  const tasks = tasksResult.success ? tasksResult.data : [];
  const listError = tasksResult.success ? null : toEnglishError(tasksResult.error);
  const projects = projectsResult.success ? projectsResult.data : [];
  const projectsError = projectsResult.success ? null : projectsResult.error;
  const queueItems = queueResult.success ? queueResult.data : [];
  const activeProjects = projects.filter((project) => !project.archived_at);
  const pomodoroStatsByTaskId: Record<
    string,
    { pomodoros_today: number; pomodoros_total: number }
  > =
    tasksResult.success && tasks.length > 0
      ? Object.fromEntries(
          await Promise.all(
            tasks.map(async (task) => {
              const statsResult = await getTaskPomodoroStats(task.id);
              return [
                task.id,
                statsResult.success
                  ? statsResult.data
                  : { pomodoros_today: 0, pomodoros_total: 0 },
              ] as const;
            }),
          ),
        )
      : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create simple tasks to map out your day.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="p-6">
          <CreateTaskForm projects={activeProjects} />
        </Card>
        <Card className="p-6">
          <div data-testid="tasks-list">
            {listError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {listError}
              </p>
            ) : tasks.length === 0 ? (
              <EmptyState />
            ) : (
              <TaskList
                tasks={tasks}
                projects={activeProjects}
                pomodoroStatsByTaskId={pomodoroStatsByTaskId}
                queueItems={queueItems}
              />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <ProjectsPanel initialProjects={projects} initialError={projectsError} />
      </Card>
    </div>
  );
}
