import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateTaskForm } from "./components/CreateTaskForm";
import { EmptyState } from "./components/EmptyState";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { TaskList } from "./components/TaskList";
import { TasksFiltersBar } from "./components/TasksFiltersBar";
import { getTaskPomodoroStats, getTasks } from "@/app/actions/tasks";
import { getTaskQueue } from "@/app/actions/queue";
import { getProjects } from "@/app/actions/projects";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { taskScheduledForSchema } from "@/lib/validation/task.schema";

const ERROR_MAP: Record<string, string> = {
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de charger les taches.": "Unable to load tasks.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string | null) {
  if (!message) return null;
  return ERROR_MAP[message] ?? message;
}

type SearchParams = Promise<{
  page?: string;
  limit?: string;
  pageSize?: string;
  project?: string;
  status?: string;
  range?: string;
  date?: string;
  scheduled?: string;
}>;

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function TasksPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const parsedPage = Number(searchParams.page);
  const page = Number.isFinite(parsedPage) && parsedPage > 0
    ? Math.floor(parsedPage)
    : 1;
  const rawPageSize = searchParams.pageSize ?? searchParams.limit;
  const parsedPageSize = Number(rawPageSize);
  const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0
    ? Math.max(5, Math.min(100, Math.floor(parsedPageSize)))
    : 5;
  const statusParam = searchParams.status;
  const status =
    statusParam === "active"
    || statusParam === "completed"
    || statusParam === "archived"
    || statusParam === "all"
      ? statusParam
      : "all";
  const scheduledParam = searchParams.scheduled;
  const scheduledOnly =
    scheduledParam === "all"
    || scheduledParam === "scheduled"
    || scheduledParam === "unscheduled"
      ? scheduledParam
      : "all";
  const rangeParam = searchParams.range;
  const scheduledRange =
    rangeParam === "day" || rangeParam === "week" || rangeParam === "all"
      ? rangeParam
      : "all";
  const parsedDate = searchParams.date
    ? taskScheduledForSchema.safeParse(searchParams.date)
    : null;
  const today = formatDate(new Date());
  const scheduledDate = parsedDate?.success ? parsedDate.data : today;
  const defaultScheduledFor =
    scheduledRange === "day" && parsedDate?.success ? parsedDate.data : null;
  const createTaskSchedulingHint =
    scheduledRange === "day"
      ? `New tasks will be scheduled for ${scheduledDate}`
      : scheduledRange === "all"
        ? "New tasks will be unscheduled"
        : null;
  const projectId = searchParams.project && searchParams.project.trim() !== ""
    ? searchParams.project
    : null;

  const [tasksResult, projectsResult, queueResult] = await Promise.all([
    getTasks({
      includeArchived: false,
      page,
      limit: pageSize,
      projectId,
      status,
      scheduledRange,
      scheduledDate,
      includeUnscheduled: true,
      scheduledOnly,
    }),
    getProjects({ includeArchived: true }),
    getTaskQueue(),
  ]);

  const tasksData = tasksResult.success ? tasksResult.data : { tasks: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } };
  const tasks = tasksData.tasks;
  const pagination = tasksData.pagination;
  const listError = tasksResult.success ? null : toEnglishError(tasksResult.error);
  if (tasksResult.success && pagination.totalPages > 0 && pagination.page > pagination.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(pagination.totalPages));
    params.set("pageSize", String(pageSize));
    if (projectId) params.set("project", projectId);
    if (status !== "all") params.set("status", status);
    if (scheduledRange !== "all") params.set("range", scheduledRange);
    if (scheduledRange !== "all") params.set("date", scheduledDate);
    if (scheduledOnly !== "all") params.set("scheduled", scheduledOnly);
    redirect(`/tasks?${params.toString()}`);
  }

  const projects = projectsResult.success ? projectsResult.data : [];
  const projectsError = projectsResult.success ? null : projectsResult.error;
  const queueItems = queueResult.success ? queueResult.data : [];
  const activeProjects = projects.filter((project) => !project.archived_at);
  const hasActiveFilters =
    Boolean(projectId)
    || status !== "all"
    || scheduledRange !== "all"
    || scheduledOnly !== "all";
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
            <CreateTaskForm
              projects={activeProjects}
              defaultScheduledFor={defaultScheduledFor}
              schedulingHint={createTaskSchedulingHint}
            />
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
              ) : (
                <div className="flex flex-col gap-4">
                  <TasksFiltersBar
                    projects={activeProjects}
                    currentStatus={status}
                    currentRange={scheduledRange}
                    currentDate={scheduledDate}
                    currentProjectId={projectId}
                    currentScheduledOnly={scheduledOnly}
                  />
                  {tasks.length === 0 ? (
                    <div className="flex flex-col gap-4">
                      {hasActiveFilters ? (
                        <div className="rounded-xl border border-border bg-muted/30 p-6">
                          <p className="text-sm font-medium text-foreground">No tasks match filters.</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Try adjusting your filters or clear them.
                          </p>
                          <div className="mt-4">
                            <Link href="/tasks" className={buttonStyles({ variant: "secondary" })}>
                              Clear filters
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <EmptyState />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <TaskList
                        tasks={tasks}
                        projects={activeProjects}
                        pomodoroStatsByTaskId={pomodoroStatsByTaskId}
                        queueItems={queueItems}
                        currentRange={scheduledRange}
                        currentDate={scheduledDate}
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
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
