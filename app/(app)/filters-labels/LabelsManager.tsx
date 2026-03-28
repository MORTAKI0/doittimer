"use client";

import * as React from "react";

import {
  createLabel,
  deleteLabel,
  updateLabel,
  type LabelRecord,
} from "@/app/actions/labels";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { LabelPill } from "@/components/ui/label-pill";
import { LABEL_COLOR_PRESETS } from "@/lib/labels/palette";
import { sortLabelsByName } from "@/lib/labels/utils";

type LabelsManagerProps = {
  initialLabels: LabelRecord[];
};

const ERROR_MAP: Record<string, string> = {
  "Le nom du label est requis.": "Label name is required.",
  "Le nom du label est trop long.": "Label name is too long.",
  "Couleur de label invalide.": "Pick one of the preset colors.",
  "Un label avec ce nom existe deja.": "A label with this name already exists.",
  "Impossible de charger les labels.": "Unable to load labels.",
  "Impossible de creer le label.": "Unable to create the label.",
  "Impossible de mettre a jour le label.": "Unable to update the label.",
  "Impossible de supprimer le label.": "Unable to delete the label.",
  "Label introuvable.": "Label not found.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

function ColorSwatchGrid(props: {
  selectedColor: string;
  onSelect: (colorHex: string) => void;
  disabled?: boolean;
  namePrefix: string;
}) {
  const { selectedColor, onSelect, disabled = false, namePrefix } = props;

  return (
    <div className="grid grid-cols-4 gap-2">
      {LABEL_COLOR_PRESETS.map((colorHex) => {
        const isSelected = selectedColor === colorHex;
        return (
          <button
            key={colorHex}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(colorHex)}
            className={[
              "focus-ring h-9 rounded-md border",
              isSelected ? "border-foreground shadow-sm" : "border-border",
            ].join(" ")}
            style={{ backgroundColor: colorHex }}
            aria-label={`${namePrefix} ${colorHex}`}
            aria-pressed={isSelected}
            title={colorHex}
          >
            <span className="sr-only">{colorHex}</span>
          </button>
        );
      })}
    </div>
  );
}

function ExistingLabelRow(props: {
  label: LabelRecord;
  onSave: (input: { id: string; name?: string; colorHex?: string }) => Promise<void>;
  onDelete: (labelId: string) => Promise<void>;
  pending: boolean;
}) {
  const { label, onSave, onDelete, pending } = props;
  const [name, setName] = React.useState(label.name);
  const [colorHex, setColorHex] = React.useState(label.colorHex);

  React.useEffect(() => {
    setName(label.name);
    setColorHex(label.colorHex);
  }, [label.colorHex, label.name]);

  const hasChanges = name.trim() !== label.name || colorHex !== label.colorHex;

  return (
    <li className="space-y-3 rounded-md border-[0.5px] border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <LabelPill name={name.trim() || label.name} colorHex={colorHex} />
          <p className="text-xs text-muted-foreground">
            Delete is immediate and removes this label from every task.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => void onDelete(label.id)}
          aria-label={`Delete label ${label.name}`}
        >
          <IconTrash className="h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <label className="space-y-1 text-sm font-medium text-muted-foreground">
          Name
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
            aria-label={`Name for ${label.name}`}
            maxLength={50}
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">Color</span>
          <ColorSwatchGrid
            selectedColor={colorHex}
            onSelect={setColorHex}
            disabled={pending}
            namePrefix={`Color for ${label.name}`}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending || !hasChanges}
          onClick={() =>
            void onSave({
              id: label.id,
              name,
              colorHex,
            })}
        >
          Save changes
        </Button>
      </div>
    </li>
  );
}

export function LabelsManager({ initialLabels }: LabelsManagerProps) {
  const [labels, setLabels] = React.useState(() => sortLabelsByName(initialLabels));
  const [newName, setNewName] = React.useState("");
  const [newColorHex, setNewColorHex] = React.useState<string>(LABEL_COLOR_PRESETS[0]);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLabels(sortLabelsByName(initialLabels));
  }, [initialLabels]);

  async function handleCreate() {
    setPendingKey("create");
    setError(null);

    const result = await createLabel({
      name: newName,
      colorHex: newColorHex,
    });

    if (!result.success) {
      setError(toEnglishError(result.error));
      setPendingKey(null);
      return;
    }

    setLabels((prev) => sortLabelsByName([...prev, result.data]));
    setNewName("");
    setNewColorHex(LABEL_COLOR_PRESETS[0]);
    setPendingKey(null);
  }

  async function handleSave(input: { id: string; name?: string; colorHex?: string }) {
    setPendingKey(input.id);
    setError(null);

    const result = await updateLabel(input);
    if (!result.success) {
      setError(toEnglishError(result.error));
      setPendingKey(null);
      return;
    }

    setLabels((prev) =>
      sortLabelsByName(prev.map((label) => (label.id === result.data.id ? result.data : label))),
    );
    setPendingKey(null);
  }

  async function handleDelete(labelId: string) {
    if (!window.confirm("Delete this label? It will be removed from every task immediately.")) {
      return;
    }

    setPendingKey(labelId);
    setError(null);

    const result = await deleteLabel(labelId);
    if (!result.success) {
      setError(toEnglishError(result.error));
      setPendingKey(null);
      return;
    }

    setLabels((prev) => prev.filter((label) => label.id !== result.data.id));
    setPendingKey(null);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="page-section-label">Labels</h2>
        <p className="text-sm text-muted-foreground">
          Create, rename, recolor, and delete labels. Removing a label detaches it from every task automatically.
        </p>
      </div>

      <div className="space-y-4 rounded-md border-[0.5px] border-border bg-card p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Create label</h3>
          <p className="text-xs text-muted-foreground">
            Labels are unique after trim and case-folding. Example: “Client” and “ client ” are the same.
          </p>
        </div>

        <label className="space-y-1 text-sm font-medium text-muted-foreground">
          Label name
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Deep work"
            maxLength={50}
            disabled={pendingKey === "create"}
            aria-label="New label name"
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">Preset colors</span>
          <ColorSwatchGrid
            selectedColor={newColorHex}
            onSelect={setNewColorHex}
            disabled={pendingKey === "create"}
            namePrefix="New label color"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <LabelPill name={newName.trim() || "Preview"} colorHex={newColorHex} />
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={pendingKey === "create"}
          >
            Create label
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {labels.length === 0 ? (
        <div className="rounded-md border-[0.5px] border-dashed border-border p-6 text-sm text-muted-foreground">
          No labels yet. Create one above, then assign it from any task edit panel.
        </div>
      ) : (
        <ul className="space-y-3">
          {labels.map((label) => (
            <ExistingLabelRow
              key={label.id}
              label={label}
              onSave={handleSave}
              onDelete={handleDelete}
              pending={pendingKey === label.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
