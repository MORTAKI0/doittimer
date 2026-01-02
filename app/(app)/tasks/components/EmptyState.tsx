export function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-200 px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-900">Aucune tache pour le moment.</p>
      <p className="text-sm text-zinc-600">
        Ajoute ta premiere tache pour demarrer ta journee.
      </p>
    </div>
  );
}
