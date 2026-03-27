"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERROR_MAP: Record<string, string> = {
  "Le titre est requis.": "Title is required.",
  "Le titre est trop long.": "Title is too long.",
  "Titre invalide.": "Invalid title.",
  "Date invalide. Format attendu: YYYY-MM-DD.": "Invalid date format. Use YYYY-MM-DD.",
  "Date invalide.": "Invalid date.",
  "Tu dois etre connecte.": "You must be signed in.",
  "Impossible de creer la tache. Reessaie.": "Unable to create task. Try again.",
  "Erreur reseau. Verifie ta connexion et reessaie.": "Network error. Check your connection and try again.",
};

type HomeQuickCreateProps = {
  today: string;
};

function toEnglishError(message: string) {
  return ERROR_MAP[message] ?? message;
}

export function HomeQuickCreate({ today }: HomeQuickCreateProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const restoreFocus = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      restoreFocus();
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createTask(trimmedTitle, null, today);
      if (!result.success) {
        setError(toEnglishError(result.error));
        restoreFocus();
        return;
      }

      setTitle("");
      restoreFocus();
      router.refresh();
      restoreFocus();
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <form
        className="group/home-quick mx-auto flex w-full flex-col items-center gap-3"
        onSubmit={handleSubmit}
      >
        <div className="w-full transition-all duration-200">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/90 p-2 shadow-[var(--shadow-lift)] backdrop-blur">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm text-background"
            >
              +
            </span>
            <label className="sr-only" htmlFor="home-quick-create">
              Add task for today
            </label>
            <Input
              ref={inputRef}
              id="home-quick-create"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="+ Add task for today..."
              aria-label="Add task for today"
              autoComplete="off"
              maxLength={500}
              disabled={isPending}
              className="h-11 border-0 bg-transparent px-0 text-sm shadow-none focus:scale-[1.001]"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-full"
              isLoading={isPending}
              loadingLabel="Adding..."
              disabled={!title.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        {error ? (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
