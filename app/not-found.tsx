import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <Card className="w-full max-w-lg space-y-4 p-8 text-center">
        <p className="text-overline">404</p>
        <h1 className="text-section-title">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you requested does not exist or has moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className={buttonStyles({ variant: "secondary" })}>Go home</Link>
          <Link href="/dashboard" className={buttonStyles()}>Dashboard</Link>
        </div>
      </Card>
    </main>
  );
}
