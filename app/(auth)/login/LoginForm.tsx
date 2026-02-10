"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/lib/auth/actions";

const ERROR_MAP: Record<string, string> = {
  "Email ou mot de passe incorrect.": "Email or password is incorrect.",
  "Confirme ton email avant de te connecter.": "Confirm your email before signing in.",
  "Un compte existe deja avec cet email.": "An account already exists with this email.",
  "Une erreur est survenue. Reessaie.": "Something went wrong. Try again.",
  "Email ou mot de passe invalide.": "Invalid email or password.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const errorMessage = state?.ok === false ? toEnglishError(state.message) : null;

  return (
    <Card className="w-full p-6">
      <h1 className="text-section-title text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back. Keep your focus on track.</p>
      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form action={formAction} className="mt-6 space-y-3">
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input name="password" type="password" placeholder="Password (min 8)" autoComplete="current-password" minLength={8} required />
        <Button type="submit" className="w-full" isLoading={pending} loadingLabel="Signing in...">
          Sign in
        </Button>
      </form>
    </Card>
  );
}
