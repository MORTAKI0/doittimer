"use client";

import type { ActiveSessionSnapshot } from "@/app/actions/sessions";
import { SessionStartControl } from "./SessionStartControl";

type ProjectSessionHeaderProps = {
  projectId: string;
  projectName: string;
  activeSession: ActiveSessionSnapshot | null;
  taskCount: number;
};

export function ProjectSessionHeader({
  projectId,
  projectName,
  activeSession,
  taskCount,
}: ProjectSessionHeaderProps) {
  return (
    <section className="rounded-md border-[0.5px] border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Project
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{projectName}</h2>
            <span className="text-sm text-muted-foreground">{taskCount} tasks</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Start time tracking from this project without selecting a task first.
          </p>
        </div>

        <SessionStartControl
          activeSession={activeSession}
          projectId={projectId}
          label="Start session"
          mode="button"
        />
      </div>
    </section>
  );
}
