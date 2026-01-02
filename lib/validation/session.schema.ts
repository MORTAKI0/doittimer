import { z } from "zod";

export const sessionIdSchema = z.string().uuid("Identifiant invalide.");

export type SessionIdInput = z.infer<typeof sessionIdSchema>;
