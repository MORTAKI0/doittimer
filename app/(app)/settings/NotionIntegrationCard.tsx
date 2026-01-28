// app/(app)/settings/NotionIntegrationCard.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  connectNotion,
  disconnectNotion,
  syncNotionNow,
  type NotionConnectionSummary,
  type NotionSyncSummary,
} from "@/app/actions/notion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type NotionIntegrationCardProps = {
  initialConnection: NotionConnectionSummary;
  initialError?: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function NotionIntegrationCard({
  initialConnection,
  initialError,
}: NotionIntegrationCardProps) {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [databaseId, setDatabaseId] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(initialError ?? null);
  const [isError, setIsError] = React.useState(Boolean(initialError));
  const [isPending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<
    "connect" | "disconnect" | "sync" | null
  >(null);
  const [syncSummary, setSyncSummary] = React.useState<NotionSyncSummary | null>(null);

  const statusLabel = initialConnection.connected
    ? initialConnection.last_status === "success"
      ? "Success"
      : initialConnection.last_status === "error"
        ? "Error"
        : "Not synced"
    : "Not connected";

  const lastSynced = formatTimestamp(initialConnection.last_synced_at);
  const errorDetails = initialConnection.last_error;

  function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);
    setPendingAction("connect");

    startTransition(async () => {
      const result = await connectNotion(token, databaseId);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        setPendingAction(null);
        return;
      }
      setToken("");
      setDatabaseId("");
      setIsError(false);
      setMessage("Notion connected.");
      setSyncSummary(null);
      setPendingAction(null);
      router.refresh();
    });
  }

  function handleDisconnect() {
    setMessage(null);
    setIsError(false);
    setPendingAction("disconnect");

    startTransition(async () => {
      const result = await disconnectNotion();
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        setPendingAction(null);
        return;
      }
      setIsError(false);
      setMessage("Notion disconnected.");
      setSyncSummary(null);
      setPendingAction(null);
      router.refresh();
    });
  }

  function handleSync() {
    setMessage(null);
    setIsError(false);
    setPendingAction("sync");

    startTransition(async () => {
      const result = await syncNotionNow();
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        setPendingAction(null);
        return;
      }
      setSyncSummary(result.data);
      setIsError(false);
      setMessage("Notion sync completed.");
      setPendingAction(null);
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Integrations
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Export projects and tasks to a Notion database.
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleConnect}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="notion-token">
              Notion token
            </label>
            <Input
              id="notion-token"
              name="notion-token"
              type="password"
              placeholder="secret_xxx"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              data-testid="notion-token"
              disabled={isPending}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="notion-database-id">
              Notion database ID
            </label>
            <Input
              id="notion-database-id"
              name="notion-database-id"
              placeholder="Database ID"
              value={databaseId}
              onChange={(event) => setDatabaseId(event.target.value)}
              data-testid="notion-database-id"
              disabled={isPending}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" data-testid="notion-connect" disabled={isPending}>
              {isPending && pendingAction === "connect" ? "Connecting..." : "Connect"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDisconnect}
              data-testid="notion-disconnect"
              disabled={isPending}
            >
              {isPending && pendingAction === "disconnect" ? "Disconnecting..." : "Disconnect"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSync}
              data-testid="notion-sync-now"
              disabled={isPending}
            >
              {isPending && pendingAction === "sync" ? "Syncing..." : "Sync now"}
            </Button>
          </div>
        </form>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
          <p data-testid="notion-last-status">
            Status: <span className="font-medium text-foreground">{statusLabel}</span>
          </p>
          <p className="mt-1">Last synced: {lastSynced}</p>
          {errorDetails ? (
            <p className="mt-2 text-sm text-red-600">{errorDetails}</p>
          ) : null}
          {syncSummary ? (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>
                Created: {syncSummary.createdProjects} projects, {syncSummary.createdTasks} tasks
              </p>
              <p>
                Updated: {syncSummary.updatedProjects} projects, {syncSummary.updatedTasks} tasks
              </p>
              <p>
                Pulled: {syncSummary.pulledProjects} projects, {syncSummary.pulledTasks} tasks
              </p>
              <p>
                Archived: {syncSummary.archivedProjects} projects, {syncSummary.archivedTasks} tasks
              </p>
              <p>
                Restored: {syncSummary.restoredProjects} projects, {syncSummary.restoredTasks} tasks
              </p>
              <p>Warnings: {syncSummary.warnings}</p>
            </div>
          ) : null}
        </div>

        {message ? (
          <p
            className={
              isError
                ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
            }
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
