import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Offline
      </p>
      <h1 className="text-3xl font-semibold text-foreground">You&apos;re offline</h1>
      <p className="text-base text-muted-foreground">
        It looks like your connection dropped. You can retry once you&apos;re back online.
      </p>
      <Link
        href="/"
        className={buttonStyles({ variant: "secondary" })}
      >
        Retry
      </Link>
    </main>
  );
}
