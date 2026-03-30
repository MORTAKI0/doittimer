import { redirect } from "next/navigation";

import { getLabels } from "@/app/actions/labels";
import { EmptyState } from "./components/EmptyState";
import { AddTaskLauncher } from "./components/AddTaskLauncher";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { ProjectSessionHeader } from "./components/ProjectSessionHeader";
import { TaskComposeOwner } from "./components/TaskComposeOwner";
import { TaskList } from "./components/TaskList";
import { TaskPageHeader } from "./components/TaskPageHeader";
import { TasksFiltersBar } from "./components/TasksFiltersBar";
import { getTaskPomodoroStats, getTasks } from "@/app/actions/tasks";
import { getTaskQueue } from "@/app/actions/queue";
import { getProjects } from "@/app/actions/projects";
import { getActiveSession } from "@/app/actions/sessions";
import { EmptyState as SharedEmptyState } from "@/components/ui/empty-state";
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
  labelId?: string | string[];
  status?: string;
  range?: string;
  date?: string;
  scheduled?: string;
  q?: string;
  from?: string;
  to?: string;
  compose?: string;
}>;

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
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
  const projectId = searchParams.project && searchParams.project.trim() !== ""
    ? searchParams.project
    : null;
  const currentLabelIds = Array.from(
    new Set(toArray(searchParams.labelId).map((value) => value.trim()).filter(Boolean)),
  );
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const completedFrom = typeof searchParams.from === "string" ? searchParams.from : null;
  const completedTo = typeof searchParams.to === "string" ? searchParams.to : null;
  const composeMode = searchParams.compose === "1";

  const [tasksResult, projectsResult, queueResult, labelsResult, activeSession] = await Promise.all([
    getTasks({
      includeArchived: false,
      page,
      limit: pageSize,
      projectId,
      labelIds: currentLabelIds,
      status,
      scheduledRange,
      scheduledDate,
      includeUnscheduled: true,
      scheduledOnly,
      query,
      completedFrom,
      completedTo,
    }),
    getProjects({ includeArchived: true }),
    getTaskQueue(),
    getLabels(),
    getActiveSession(),
  ]);

  const availableLabels = labelsResult.success ? labelsResult.data : [];
  const validLabelIdSet = new Set(availableLabels.map((label) => label.id));
  const sanitizedLabelIds =
    labelsResult.success
      ? currentLabelIds.filter((labelId) => validLabelIdSet.has(labelId))
      : currentLabelIds;

  if (labelsResult.success && sanitizedLabelIds.length !== currentLabelIds.length) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (projectId) params.set("project", projectId);
    if (status !== "all") params.set("status", status);
    if (scheduledRange !== "all") params.set("range", scheduledRange);
    if (scheduledRange !== "all") params.set("date", scheduledDate);
    if (scheduledOnly !== "all") params.set("scheduled", scheduledOnly);
    if (query.length > 0) params.set("q", query);
    if (completedFrom) params.set("from", completedFrom);
    if (completedTo) params.set("to", completedTo);
    if (composeMode) params.set("compose", "1");
    for (const labelId of sanitizedLabelIds) {
      params.append("labelId", labelId);
    }
    redirect(`/tasks${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const tasksData = tasksResult.success ? tasksResult.data : { tasks: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } };
  const tasks = tasksData.tasks;
  const pagination = tasksData.pagination;
  const listError = tasksResult.success ? null : toEnglishError(tasksResult.error);
  if (tasksResult.success && pagination.totalPages > 0 && pagination.page > pagination.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(pagination.totalPages));
    params.set("pageSize", String(pageSize));
    if (projectId) params.set("project", projectId);
    for (const labelId of sanitizedLabelIds) params.append("labelId", labelId);
    if (status !== "all") params.set("status", status);
    if (scheduledRange !== "all") params.set("range", scheduledRange);
    if (scheduledRange !== "all") params.set("date", scheduledDate);
    if (scheduledOnly !== "all") params.set("scheduled", scheduledOnly);
    if (query.length > 0) params.set("q", query);
    if (completedFrom) params.set("from", completedFrom);
    if (completedTo) params.set("to", completedTo);
    if (composeMode) params.set("compose", "1");
    redirect(`/tasks?${params.toString()}`);
  }

  const projects = projectsResult.success ? projectsResult.data : [];
  const projectsError = projectsResult.success ? null : projectsResult.error;
  const queueItems = queueResult.success ? queueResult.data : [];
  const activeProjects = projects.filter((project) => !project.archived_at);
  const currentProject = projectId
    ? projects.find((project) => project.id === projectId) ?? null
    : null;
  const hasActiveFilters =
    Boolean(projectId)
    || status !== "all"
    || scheduledRange !== "all"
    || scheduledOnly !== "all"
    || sanitizedLabelIds.length > 0
    || query.length > 0
    || Boolean(completedFrom)
    || Boolean(completedTo);
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
    <TaskComposeOwner
      projects={activeProjects}
      defaultScheduledFor={scheduledRange === "day" ? scheduledDate : null}
      defaultProjectId={projectId}
    >
      <div className="space-y-8">
        <TaskPageHeader
          title="Tasks"
          count={pagination.totalCount}
          description="Plan your day, manage queue order, and keep task states clean."
          action={(
            <AddTaskLauncher
              projects={activeProjects}
              defaultScheduledFor={scheduledRange === "day" ? scheduledDate : null}
              defaultProjectId={projectId}
            />
          )}
        />

        {currentProject ? (
          <ProjectSessionHeader
            projectId={currentProject.id}
            projectName={currentProject.name}
            taskCount={tasks.length}
            activeSession={activeSession}
          />
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <ProjectsPanel initialProjects={projects} initialError={projectsError} />
          </div>

          <div className="page-content-column space-y-6">
            <div data-testid="tasks-list" className="space-y-4">
              {listError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {listError}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  <TasksFiltersBar
                    projects={activeProjects}
                    labels={availableLabels}
                    currentStatus={status}
                    currentRange={scheduledRange}
                    currentDate={scheduledDate}
                    currentProjectId={projectId}
                    currentLabelIds={sanitizedLabelIds}
                    currentScheduledOnly={scheduledOnly}
                    currentQuery={query}
                  />
                  {tasks.length === 0 ? (
                    <div className="flex flex-col gap-4">
                      {hasActiveFilters ? (
                        <SharedEmptyState
                          title="No tasks match these filters"
                          description="Try broader filters or clear everything."
                          actionLabel="Clear filters"
                          actionHref="/tasks"
                        />
                      ) : (
                        <EmptyState
                          action={(
                            <AddTaskLauncher
                              projects={activeProjects}
                              defaultProjectId={projectId}
                            />
                          )}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <TaskList
                        tasks={tasks}
                        availableLabels={availableLabels}
                        projects={activeProjects}
                        activeSession={activeSession}
                        pomodoroStatsByTaskId={pomodoroStatsByTaskId}
                        queueItems={queueItems}
                        currentRange={scheduledRange}
                        currentDate={scheduledDate}
                        inlineCreateDefaultProjectId={projectId}
                      />

                      <div className="border-t border-border pt-4">
                        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TaskComposeOwner>
  );
}
