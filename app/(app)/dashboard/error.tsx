"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard:error-boundary]", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <h2 className="text-base font-semibold">Dashboard failed to load</h2>
      <p className="text-sm">Please retry. If this keeps happening, sign in again.</p>
      {error.digest ? <p className="text-xs">Digest: {error.digest}</p> : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}
