"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buttonStyles } from "@/components/ui/button";
import { useTaskCompose } from "./TaskComposeOwner";

type ProjectOption = {
  id: string;
  name: string;
};

type AddTaskLauncherProps = {
  projects?: ProjectOption[];
  defaultScheduledFor?: string | null;
  defaultProjectId?: string | null;
  variant?: "nav" | "secondary" | "primary";
  size?: "sm" | "md";
  label?: string;
  className?: string;
};

export function AddTaskLauncher({
  projects = [],
  defaultScheduledFor = null,
  defaultProjectId = null,
  variant = "secondary",
  size = "sm",
  label = "Add task",
  className = "",
}: AddTaskLauncherProps) {
  void projects;
  const compose = useTaskCompose();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const triggerClassName =
    variant === "nav"
      ? [
          "nav-action-link focus-ring min-h-0 px-0 py-2",
          className,
        ].filter(Boolean).join(" ")
      : buttonStyles({
          variant: variant === "primary" ? "primary" : "secondary",
          size,
          className,
        });

  function buildComposeHref() {
    const isTaskRoute =
      pathname === "/tasks"
      || pathname === "/inbox"
      || pathname === "/today"
      || pathname === "/upcoming";

    if (!isTaskRoute) {
      return "/tasks?compose=1";
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("compose", "1");
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : `${pathname}?compose=1`;
  }

  function handleClick() {
    if (compose) {
      compose.openCompose({
        defaultScheduledFor,
        defaultProjectId,
      });
      return;
    }

    router.push(buildComposeHref(), { scroll: false });
  }

  return (
    <button type="button" className={triggerClassName} onClick={handleClick}>
      {variant === "nav" ? (
        <>
          <span className="nav-action-icon text-base leading-none text-current" aria-hidden="true">
            +
          </span>
          <span>{label}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
