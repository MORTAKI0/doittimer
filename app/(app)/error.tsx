"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";
import { toPublicMessage } from "@/lib/errors/mapError";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = toPublicMessage(error);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-10 text-foreground">
      <Card className="w-full max-w-lg space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            DoItTimer
          </p>
          <h1 className="text-2xl font-semibold">We could not load your workspace.</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className={buttonStyles({ variant: "secondary" })}>
            Go home
          </Link>
        </div>
      </Card>
    </div>
  );
}
