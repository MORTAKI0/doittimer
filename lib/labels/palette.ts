export const LABEL_COLOR_PRESETS = [
  "#DB4035",
  "#EB8909",
  "#F9C74F",
  "#299438",
  "#6ACCBC",
  "#158FAD",
  "#14AAF5",
  "#96C3EB",
  "#4073FF",
  "#884DFF",
  "#AF38EB",
  "#E05194",
] as const;

export type LabelColorPreset = (typeof LABEL_COLOR_PRESETS)[number];

export function isLabelColorPreset(value: string): value is LabelColorPreset {
  return LABEL_COLOR_PRESETS.includes(value.toUpperCase() as LabelColorPreset);
}

export function normalizeLabelColor(value: string) {
  return value.trim().toUpperCase();
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
