export function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-200 px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-900">No tasks yet.</p>
      <p className="text-sm text-zinc-600">
        Add your first task to start your day with clarity.
      </p>
    </div>
  );
}
