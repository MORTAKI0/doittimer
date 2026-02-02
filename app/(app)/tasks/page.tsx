import { CreateTaskForm } from "./components/CreateTaskForm";
import { EmptyState } from "./components/EmptyState";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { TaskList } from "./components/TaskList";
import { getTaskPomodoroStats, getTasks } from "@/app/actions/tasks";
import { getTaskQueue } from "@/app/actions/queue";
import { getProjects } from "@/app/actions/projects";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string | null) {
  if (!message) return null;
  return ERROR_MAP[message] ?? message;
}

type SearchParams = Promise<{ page?: string; limit?: string }>;

export default async function TasksPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 5;

  const [tasksResult, projectsResult, queueResult] = await Promise.all([
    getTasks({ includeArchived: true, page, limit }),
    getProjects({ includeArchived: true }),
    getTaskQueue(),
  ]);

  const tasksData = tasksResult.success ? tasksResult.data : { tasks: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } };
  const tasks = tasksData.tasks;
  const pagination = tasksData.pagination;
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
    <div className="relative space-y-8">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="blob blob-emerald absolute -right-20 -top-20 h-72 w-72 animate-float-slow opacity-40" />
        <div className="blob blob-teal absolute -left-16 top-40 h-56 w-56 animate-float opacity-30" />
      </div>

      {/* Hero Header */}
      <div className="animate-fade-in-up opacity-0">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="gradient-text text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create simple tasks to map out your day.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">

        {/* Sidebar (Projects + Create Task shortcut on mobile maybe, but here sidebar is for navigation/filtering context) */}
        <div className="space-y-6 animate-fade-in-up opacity-0 delay-100 lg:sticky lg:top-8 lg:h-fit">
          {/* Create Task Form - Moved to Sidebar/Top for easy access */}
          <Card className="glass-card card-hover-lift p-4">
            <CreateTaskForm projects={activeProjects} />
          </Card>

          {/* Projects Panel */}
          <Card className="glass-card card-hover-lift p-4">
            <ProjectsPanel initialProjects={projects} initialError={projectsError} />
          </Card>
        </div>

        {/* Main Task List Area */}
        <div className="space-y-6 animate-fade-in-up opacity-0 delay-200">
          <Card className="glass-card card-hover-lift p-6">
            <div data-testid="tasks-list">
              {listError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {listError}
                </p>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <EmptyState />
                  {/* Show pagination even if empty if we are on a high page to allow going back? No, empty state usually implies no tasks. But if page > 1 and tasks empty, show BACK button. */}
                  {pagination.page > 1 && (
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <TaskList
                    tasks={tasks}
                    projects={activeProjects}
                    pomodoroStatsByTaskId={pomodoroStatsByTaskId}
                    queueItems={queueItems}
                  />

                  <div className="border-t border-border pt-4">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
