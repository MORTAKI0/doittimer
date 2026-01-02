//file: lib/auth/actions.ts
"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth.schema";

type ActionState = { ok: true } | { ok: false; message: string };

function toMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirme ton email avant de te connecter.";
  }

  if (message.includes("user already registered")) {
    return "Un compte existe deja avec cet email.";
  }

  return "Une erreur est survenue. Reessaie.";
}

export async function signUpAction(
  _: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { ok: false, message: "Email ou mot de passe invalide (min 8 caracteres)." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) return { ok: false, message: toMessage(error) };
  } catch {
    return { ok: false, message: "Erreur reseau. Verifie ta connexion et reessaie." };
  }

  redirect("/login?signup=1");
}

export async function signInAction(
  _: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { ok: false, message: "Email ou mot de passe invalide." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) return { ok: false, message: toMessage(error) };
  } catch {
    return { ok: false, message: "Erreur reseau. Verifie ta connexion et reessaie." };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore network errors on sign out.
  }
  redirect("/");
}
