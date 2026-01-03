export function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-foreground">No tasks yet.</p>
      <p className="text-sm text-muted-foreground">
        Add your first task to start your day with clarity.
      </p>
    </div>
  );
}
