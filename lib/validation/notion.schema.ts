import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NO_DASH_REGEX = /^[0-9a-f]{32}$/i;

function isValidNotionDatabaseId(value: string) {
  const trimmed = value.trim();
  if (UUID_REGEX.test(trimmed)) return true;
  const normalized = trimmed.replace(/-/g, "");
  return UUID_NO_DASH_REGEX.test(normalized);
}

export const notionTokenSchema = z
  .string()
  .trim()
  .min(10, "Notion token is required.")
  .max(200, "Notion token is too long.")
  .refine((value) => !/\s/.test(value), {
    message: "Notion token is invalid.",
  });

export const notionDatabaseIdSchema = z
  .string()
  .trim()
  .min(1, "Notion database id is required.")
  .refine(isValidNotionDatabaseId, {
    message: "Notion database id is invalid.",
  });

export function normalizeNotionDatabaseId(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!isValidNotionDatabaseId(trimmed)) return null;
  const normalized = trimmed.replace(/-/g, "");
  if (!UUID_NO_DASH_REGEX.test(normalized)) return null;
  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20),
  ].join("-");
}
