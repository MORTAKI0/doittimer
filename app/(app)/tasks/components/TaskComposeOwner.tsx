"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { TaskRow } from "@/app/actions/tasks";
import { AddTaskModal } from "./AddTaskModal";

type ProjectOption = {
  id: string;
  name: string;
};

type ComposeDefaults = {
  defaultScheduledFor?: string | null;
  defaultProjectId?: string | null;
};

type TaskComposeContextValue = {
  openCompose: (defaults?: ComposeDefaults) => void;
};

const TaskComposeContext = React.createContext<TaskComposeContextValue | null>(null);

type TaskComposeOwnerProps = {
  children: React.ReactNode;
  projects: ProjectOption[];
  defaultScheduledFor?: string | null;
  defaultProjectId?: string | null;
  onCreated?: (task: TaskRow) => void;
};

export function TaskComposeOwner({
  children,
  projects,
  defaultScheduledFor = null,
  defaultProjectId = null,
  onCreated,
}: TaskComposeOwnerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [open, setOpen] = React.useState(false);
  const [draftDefaults, setDraftDefaults] = React.useState<Required<ComposeDefaults>>({
    defaultScheduledFor,
    defaultProjectId,
  });
  const autoOpenHandledRef = React.useRef(false);

  React.useEffect(() => {
    if (open) return;
    setDraftDefaults({
      defaultScheduledFor,
      defaultProjectId,
    });
  }, [defaultProjectId, defaultScheduledFor, open]);

  const openCompose = React.useCallback((defaults?: ComposeDefaults) => {
    setDraftDefaults({
      defaultScheduledFor:
        defaults?.defaultScheduledFor === undefined
          ? defaultScheduledFor
          : defaults.defaultScheduledFor,
      defaultProjectId:
        defaults?.defaultProjectId === undefined
          ? defaultProjectId
          : defaults.defaultProjectId,
    });
    setOpen(true);
  }, [defaultProjectId, defaultScheduledFor]);

  React.useEffect(() => {
    const compose = searchParams.get("compose");
    if (compose !== "1") {
      autoOpenHandledRef.current = false;
      return;
    }

    if (autoOpenHandledRef.current) return;
    autoOpenHandledRef.current = true;
    openCompose();

    const params = new URLSearchParams(searchParamsKey);
    params.delete("compose");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [openCompose, pathname, router, searchParams, searchParamsKey]);

  return (
    <TaskComposeContext.Provider value={{ openCompose }}>
      {children}
      <AddTaskModal
        open={open}
        onClose={() => setOpen(false)}
        projects={projects}
        defaultScheduledFor={draftDefaults.defaultScheduledFor}
        defaultProjectId={draftDefaults.defaultProjectId}
        onCreated={onCreated}
      />
    </TaskComposeContext.Provider>
  );
}

export function useTaskCompose() {
  return React.useContext(TaskComposeContext);
}
