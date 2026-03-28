export type LabelLike = {
  id: string;
  name: string;
  colorHex: string;
};

export function normalizeLabelName(value: string) {
  return value.trim();
}

export function normalizeLabelNameForUniqueness(value: string) {
  return normalizeLabelName(value).toLowerCase();
}

export function sortLabelsByName<T extends LabelLike>(labels: T[]) {
  return [...labels].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function dedupeLabelIds(labelIds: string[]) {
  return Array.from(new Set(labelIds));
}
