import { CreateTaskForm } from "./components/CreateTaskForm";
import { EmptyState } from "./components/EmptyState";
import { TaskList } from "./components/TaskList";
import { getTasks } from "@/app/actions/tasks";
import { Card } from "@/components/ui/card";

export default async function TasksPage() {
  const tasksResult = await getTasks();
  const tasks = tasksResult.success ? tasksResult.data : [];
  const listError = tasksResult.success ? null : tasksResult.error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Cree des taches simples pour planifier ta journee.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card>
          <CreateTaskForm />
        </Card>
        <Card>
          {listError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {listError}
            </p>
          ) : tasks.length === 0 ? (
            <EmptyState />
          ) : (
            <TaskList tasks={tasks} />
          )}
        </Card>
      </div>
    </div>
  );
}
