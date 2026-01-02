import { TaskRow } from "@/app/actions/tasks";

type TaskListProps = {
  tasks: TaskRow[];
};

export function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Mes taches
      </h2>
      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-zinc-400" aria-hidden="true" />
            <span className="text-sm text-zinc-900">{task.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
