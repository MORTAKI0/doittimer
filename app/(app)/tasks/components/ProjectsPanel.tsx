"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  createProject,
  renameProject,
  setProjectArchived,
  type ProjectRow,
} from "@/app/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

type ProjectsPanelProps = {
  initialProjects: ProjectRow[];
  initialError?: string | null;
};

const ERROR_MAP: Record<string, string> = {
  "Le nom est requis.": "Project name is required.",
  "Le nom est trop long.": "Project name is too long.",
  "Nom invalide.": "Invalid project name.",
  "Identifiant invalide.": "Invalid identifier.",
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de creer le projet. Reessaie.": "Unable to create project. Try again.",
  "Impossible de charger les projets.": "Unable to load projects.",
  "Impossible de mettre a jour le projet.": "Unable to update the project.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

function isArchived(project: ProjectRow) {
  return Boolean(project.archived_at);
}

export function ProjectsPanel({ initialProjects, initialError }: ProjectsPanelProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<ProjectRow[]>(initialProjects);
  const [showArchived, setShowArchived] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [error, setError] = React.useState<string | null>(
    initialError ? toEnglishError(initialError) : null,
  );
  const [pendingIds, setPendingIds] = React.useState<Record<string, boolean>>({});
  const [errorsById, setErrorsById] = React.useState<Record<string, string | null>>(
    {},
  );
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  React.useEffect(() => {
    setItems(initialProjects);
  }, [initialProjects]);

  function setPending(id: string, value: boolean) {
    setPendingIds((prev) => ({ ...prev, [id]: value }));
  }

  function setRowError(id: string, message: string | null) {
    setErrorsById((prev) => ({ ...prev, [id]: message }));
  }

  function startEditing(project: ProjectRow) {
    setEditingId(project.id);
    setDraftName(project.name);
    setRowError(project.id, null);
  }

  function cancelEditing() {
    if (editingId) {
      setRowError(editingId, null);
    }
    setEditingId(null);
    setDraftName("");
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await createProject(trimmedName);

    if (!result.success) {
      setError(toEnglishError(result.error));
      setIsCreating(false);
      return;
    }

    setNewName("");
    setItems((prev) => [result.data, ...prev]);
    setIsCreating(false);
    router.refresh();
  }

  async function handleRename(project: ProjectRow) {
    if (pendingIds[project.id]) return;
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setRowError(project.id, "Project name is required.");
      return;
    }

    setPending(project.id, true);
    setRowError(project.id, null);

    const result = await renameProject(project.id, trimmedName);

    if (!result.success) {
      setRowError(project.id, toEnglishError(result.error));
      setPending(project.id, false);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === project.id ? result.data : item)),
    );
    cancelEditing();
    setPending(project.id, false);
    router.refresh();
  }

  async function handleArchiveToggle(project: ProjectRow, archived: boolean) {
    if (pendingIds[project.id]) return;
    setPending(project.id, true);
    setRowError(project.id, null);

    const result = await setProjectArchived(project.id, archived);

    if (!result.success) {
      setRowError(project.id, toEnglishError(result.error));
      setPending(project.id, false);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === project.id ? result.data : item)),
    );
    setPending(project.id, false);
    router.refresh();
  }

  const visibleItems = showArchived ? items : items.filter((item) => !isArchived(item));
  const hasArchived = items.some((item) => isArchived(item));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        <p className="text-sm text-muted-foreground">
          Group tasks under small, focused projects.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleCreate}>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="project-name">
            Project name
          </label>
          <Input
            id="project-name"
            name="project-name"
            placeholder="e.g. Sprint planning"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            disabled={isCreating}
            aria-invalid={Boolean(error)}
          />
        </div>
        <Button type="submit" disabled={isCreating || newName.trim().length === 0}>
          {isCreating ? "Creating..." : "Add project"}
        </Button>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {hasArchived ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="h-4 w-4 rounded border-border text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          />
          Show archived
        </label>
      ) : null}

      {visibleItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          {showArchived
            ? "No archived projects."
            : "No projects yet. Create one to get started."}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((project) => {
            const rowError = errorsById[project.id];
            const isEditing = editingId === project.id;
            const isPending = Boolean(pendingIds[project.id]);
            const archived = isArchived(project);

            return (
              <div
                key={project.id}
                className="rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {archived ? <Badge variant="warning">Archived</Badge> : null}
                    <span>{project.name}</span>
                  </div>

                  {!isEditing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {!archived ? (
                        <IconButton
                          type="button"
                          onClick={() => startEditing(project)}
                          disabled={isPending}
                          aria-label="Rename project"
                        >
                          <IconPencil className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant={archived ? "primary" : "secondary"}
                        onClick={() => handleArchiveToggle(project, !archived)}
                        disabled={isPending}
                      >
                        {archived ? "Restore" : "Archive"}
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full space-y-2 sm:max-w-xs">
                      <Input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        disabled={isPending}
                        aria-label="Edit project name"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleRename(project)}
                          disabled={isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={cancelEditing}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {rowError ? (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {rowError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
