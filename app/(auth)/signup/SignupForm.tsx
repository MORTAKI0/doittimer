"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/lib/auth/actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);

  return (
    <Card className="w-full p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Signup</h1>
      <p className="mt-2 text-sm text-zinc-600">Cree ton compte pour commencer.</p>
      {state?.ok === false ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <form action={formAction} className="mt-6 space-y-3">
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input
          name="password"
          type="password"
          placeholder="Mot de passe (min 8)"
          autoComplete="new-password"
          required
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creation..." : "Creer un compte"}
        </Button>
      </form>
    </Card>
  );
}
