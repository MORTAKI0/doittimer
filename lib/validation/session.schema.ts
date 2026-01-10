import { z } from "zod";

export const sessionIdSchema = z.string().uuid("Identifiant invalide.");

export type SessionIdInput = z.infer<typeof sessionIdSchema>;

const musicUrlSchema = z
  .string()
  .trim()
  .max(1000, "Lien musical invalide.")
  .url("Lien musical invalide.")
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "Lien musical invalide." });

export function normalizeMusicUrl(
  input: unknown,
): { value: string | null; error: string | null } {
  if (input == null) return { value: null, error: null };
  if (typeof input !== "string") return { value: null, error: "Lien musical invalide." };
  const trimmed = input.trim();
  if (trimmed === "") return { value: null, error: null };
  const parsed = musicUrlSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { value: null, error: "Lien musical invalide." };
  }
  return { value: parsed.data, error: null };
}
