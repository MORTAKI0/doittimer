import { getProjects } from "@/app/actions/projects";
import { getInboxTasks } from "@/app/actions/tasks";
import { EmptyState } from "@/components/ui/empty-state";
import { AddTaskLauncher } from "@/app/(app)/tasks/components/AddTaskLauncher";
import { TaskComposeOwner } from "@/app/(app)/tasks/components/TaskComposeOwner";
import { TaskList } from "@/app/(app)/tasks/components/TaskList";
import { TaskPageHeader } from "@/app/(app)/tasks/components/TaskPageHeader";

export default async function InboxPage() {
  const [tasksResult, projectsResult] = await Promise.all([
    getInboxTasks(),
    getProjects(),
  ]);

  const tasks = tasksResult.success ? tasksResult.data : [];
  const projects = projectsResult.success ? projectsResult.data.filter((project) => !project.archived_at) : [];
  const error = tasksResult.success ? null : tasksResult.error;

  return (
    <TaskComposeOwner projects={projects} defaultProjectId={null}>
      <div className="page-content-column space-y-6">
        <TaskPageHeader
          title="Inbox"
          count={tasks.length}
          description="Everything not yet assigned to a project."
          action={<AddTaskLauncher projects={projects} defaultProjectId={null} />}
        />

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="Inbox is clear"
            description="Unassigned tasks will appear here as soon as you capture them."
            action={<AddTaskLauncher projects={projects} defaultProjectId={null} label="Create task" />}
          />
        ) : (
          <TaskList
            tasks={tasks}
            projects={projects}
            showQueueSection={false}
            showListHeader={false}
            inlineCreateDefaultProjectId={null}
          />
        )}
      </div>
    </TaskComposeOwner>
  );
}
