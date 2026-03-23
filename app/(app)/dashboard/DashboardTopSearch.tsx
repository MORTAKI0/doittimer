"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { IconDashboard } from "@/components/ui/icons";

export function DashboardTopSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/tasks?q=${encodeURIComponent(trimmed)}` : "/tasks");
  }

  return (
    <form className="dashboard-topbar-search" onSubmit={handleSubmit}>
      <span className="dashboard-topbar-search-icon" aria-hidden="true">
        <IconDashboard size={15} />
      </span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        placeholder="Search tasks..."
        aria-label="Search tasks"
      />
    </form>
  );
}
