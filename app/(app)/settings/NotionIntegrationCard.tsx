// app/(app)/settings/NotionIntegrationCard.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  disconnectNotion,
  runNotionImport,
  saveNotionConnection,
  validateNotionConnection,
  type NotionConnectionSummary,
  type NotionSyncSummary,
  type NotionValidationSummary,
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
  const [databaseId, setDatabaseId] = React.useState(initialConnection.database_id ?? "");
  const [message, setMessage] = React.useState<string | null>(initialError ?? null);
  const [isError, setIsError] = React.useState(Boolean(initialError));
  const [isPending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<
    "connect" | "validate" | "disconnect" | "sync" | null
  >(null);
  const [validation, setValidation] = React.useState<NotionValidationSummary | null>(null);
  const [syncSummary, setSyncSummary] = React.useState<NotionSyncSummary | null>(null);

  React.useEffect(() => {
    setDatabaseId(initialConnection.database_id ?? "");
  }, [initialConnection.database_id]);

  const statusLabel = initialConnection.connected
    ? initialConnection.last_status === "success"
      ? "Success"
      : initialConnection.last_status === "error"
        ? "Error"
        : initialConnection.last_status === "running"
          ? "Syncing"
          : "Connected"
    : "Not connected";

  function handleValidate() {
    setMessage(null);
    setIsError(false);
    setPendingAction("validate");

    startTransition(async () => {
      const result = await validateNotionConnection(token, databaseId);
      if (!result.success) {
        setValidation(null);
        setIsError(true);
        setMessage(result.error);
        setPendingAction(null);
        return;
      }

      setValidation(result.data);
      setIsError(false);
      setMessage("Notion database validated.");
      setPendingAction(null);
    });
  }

  function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);
    setPendingAction("connect");

    startTransition(async () => {
      const result = await saveNotionConnection(token, databaseId);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        setPendingAction(null);
        return;
      }

      setToken("");
      setValidation(null);
      setSyncSummary(null);
      setIsError(false);
      setMessage("Notion connection saved.");
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

      setToken("");
      setDatabaseId("");
      setValidation(null);
      setSyncSummary(null);
      setIsError(false);
      setMessage("Notion disconnected.");
      setPendingAction(null);
      router.refresh();
    });
  }

  function handleSync() {
    setMessage(null);
    setIsError(false);
    setPendingAction("sync");

    startTransition(async () => {
      const result = await runNotionImport();
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        setPendingAction(null);
        return;
      }

      setSyncSummary(result.data);
      setIsError(false);
      setMessage("Notion import completed.");
      setPendingAction(null);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Integrations
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Import projects and tasks from one Notion database. The token is saved securely on the server and reused for future syncs.
          </p>
        </div>

        <form className="space-y-3 rounded-xl border border-border/70 p-4" onSubmit={handleConnect}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="notion-token">
              Notion token
            </label>
            <Input
              id="notion-token"
              name="notion-token"
              type="password"
              placeholder={initialConnection.has_saved_token ? "Leave blank to keep saved token" : "secret_xxx"}
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
          <p className="text-xs text-muted-foreground">
            Required Notion properties: <span className="font-medium text-foreground">Name</span> and <span className="font-medium text-foreground">Project</span>. Optional: Status, Due Date, Notes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleValidate} data-testid="notion-validate" disabled={isPending || (!token.trim() && !initialConnection.has_saved_token) || databaseId.trim().length === 0}>
              {isPending && pendingAction === "validate" ? "Validating..." : "Validate"}
            </Button>
            <Button type="submit" data-testid="notion-connect" disabled={isPending || (!token.trim() && !initialConnection.has_saved_token) || databaseId.trim().length === 0}>
              {isPending && pendingAction === "connect" ? "Saving..." : initialConnection.connected ? "Update connection" : "Connect"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDisconnect}
              data-testid="notion-disconnect"
              disabled={isPending || !initialConnection.connected}
            >
              {isPending && pendingAction === "disconnect" ? "Disconnecting..." : "Disconnect"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSync}
              data-testid="notion-sync-now"
              disabled={isPending || !initialConnection.connected}
            >
              {isPending && pendingAction === "sync" ? "Syncing..." : "Sync now"}
            </Button>
          </div>
        </form>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
          <p data-testid="notion-last-status">
            Status: <span className="font-medium text-foreground">{statusLabel}</span>
          </p>
          <p className="mt-1">Saved token: {initialConnection.has_saved_token ? "Yes" : "No"}</p>
          <p className="mt-1">Database ID: {initialConnection.database_id ?? "Not saved"}</p>
          <p className="mt-1">Last synced: {formatTimestamp(initialConnection.last_synced_at)}</p>
          {initialConnection.last_error ? (
            <p className="mt-2 text-sm text-red-600">{initialConnection.last_error}</p>
          ) : null}
          {validation ? (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>Validated database: {validation.database_title ?? validation.database_id}</p>
              <p>Schema: fixed Notion import v1</p>
            </div>
          ) : null}
          {syncSummary ? (
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>
                Projects: +{syncSummary.createdProjects} created, {syncSummary.updatedProjects} updated, {syncSummary.archivedProjects} archived, {syncSummary.restoredProjects} restored
              </p>
              <p>
                Tasks: +{syncSummary.createdTasks} created, {syncSummary.updatedTasks} updated, {syncSummary.archivedTasks} archived, {syncSummary.restoredTasks} restored
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
