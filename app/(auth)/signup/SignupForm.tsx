"use client";

import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/lib/auth/actions";

const ERROR_MAP: Record<string, string> = {
  "Email ou mot de passe incorrect.": "Email or password is incorrect.",
  "Confirme ton email avant de te connecter.": "Confirm your email before signing in.",
  "Un compte existe deja avec cet email.": "An account already exists with this email.",
  "Une erreur est survenue. Reessaie.": "Something went wrong. Try again.",
  "Email ou mot de passe invalide.": "Invalid email or password.",
  "Email ou mot de passe invalide (min 8 caracteres).": "Invalid email or password (min 8 characters).",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const LEVELS = [
  { label: "Weak", className: "bg-red-400", min: 0 },
  { label: "Fair", className: "bg-amber-400", min: 2 },
  { label: "Good", className: "bg-emerald-400", min: 3 },
  { label: "Strong", className: "bg-emerald-600", min: 4 },
] as const;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const [password, setPassword] = React.useState("");
  const errorMessage = state?.ok === false ? toEnglishError(state.message) : null;
  const score = strength(password);
  const level = LEVELS.slice().reverse().find((item) => score >= item.min) ?? LEVELS[0];

  return (
    <Card className="w-full p-6">
      <h2 className="text-section-title text-foreground">Create account</h2>
      <p className="mt-1 text-sm text-muted-foreground">Start tracking focused work in minutes.</p>
      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form action={formAction} className="mt-6 space-y-3">
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password (min 8)"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div>
          <div className="h-2 rounded-full bg-muted">
            <div className={["h-2 rounded-full transition-all", level.className].join(" ")} style={{ width: `${Math.max(10, (score / 4) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Password strength: {level.label}</p>
        </div>
        <Button type="submit" className="w-full" isLoading={pending} loadingLabel="Creating...">
          Create account
        </Button>
      </form>
    </Card>
  );
}
