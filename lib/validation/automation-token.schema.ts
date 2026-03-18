import { z } from "zod";

export const automationTokenNameSchema = z
  .string()
  .trim()
  .min(1, "Token name is required.")
  .max(100, "Token name must be 100 characters or fewer.");

export const automationTokenIdSchema = z.string().uuid("Invalid token id.");
