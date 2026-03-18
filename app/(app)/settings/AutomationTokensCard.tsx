"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  createToken,
  revokeToken,
  type AutomationTokenListItem,
} from "@/app/actions/automationTokens";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type AutomationTokensCardProps = {
  initialTokens: AutomationTokenListItem[];
  initialError?: string | null;
};

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Never";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const diffMs = parsed.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  return rtf.format(Math.round(diffMs / day), "day");
}

export function AutomationTokensCard({
  initialTokens,
  initialError = null,
}: AutomationTokensCardProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [tokens, setTokens] = React.useState(initialTokens);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [tokenName, setTokenName] = React.useState("");
  const [createdToken, setCreatedToken] = React.useState<{
    id: string;
    rawToken: string;
    prefix: string;
  } | null>(null);
  const [tokenToRevoke, setTokenToRevoke] = React.useState<AutomationTokenListItem | null>(null);
  const [message, setMessage] = React.useState<string | null>(initialError);
  const [isError, setIsError] = React.useState(Boolean(initialError));
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setTokens(initialTokens);
  }, [initialTokens]);

  function closeCreateDialog() {
    setIsCreateOpen(false);
    setTokenName("");
    setCreatedToken(null);
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const result = await createToken(tokenName);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        return;
      }

      const createdAt = new Date().toISOString();
      setCreatedToken(result.data);
      setTokens((prev) => [
        {
          id: result.data.id,
          name: tokenName.trim(),
          tokenPrefix: result.data.prefix,
          scopes: ["*"],
          createdAt,
          lastUsedAt: null,
        },
        ...prev,
      ]);
      setTokenName("");
      pushToast({
        title: "Token created",
        description: "Copy it now. It will not be shown again.",
        variant: "success",
      });
      router.refresh();
    });
  }

  function handleCopyToken() {
    if (!createdToken) return;

    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(createdToken.rawToken);
        pushToast({
          title: "Token copied",
          variant: "success",
        });
      } catch {
        pushToast({
          title: "Copy failed",
          description: "Clipboard access was denied.",
          variant: "error",
        });
      }
    });
  }

  function handleConfirmRevoke() {
    if (!tokenToRevoke) return;

    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const result = await revokeToken(tokenToRevoke.id);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        return;
      }

      setTokens((prev) => prev.filter((token) => token.id !== tokenToRevoke.id));
      setTokenToRevoke(null);
      pushToast({
        title: "Token revoked",
        description: "Agent access using this token is now blocked.",
        variant: "success",
      });
      router.refresh();
    });
  }

  return (
    <>
      <Card className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Settings
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">
              Automation &amp; API Access
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and revoke private bearer tokens for external agents.
            </p>
          </div>
          <Button
            onClick={() => {
              setIsCreateOpen(true);
              setMessage(null);
              setIsError(false);
            }}
            data-testid="automation-token-create-open"
          >
            Create new token
          </Button>
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

        {tokens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
            No automation tokens yet. Create one to connect an external agent.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-left text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Prefix</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td className="px-4 py-3 text-foreground">{token.name}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">
                        {token.tokenPrefix}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTimestamp(token.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelativeTime(token.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setTokenToRevoke(token)}
                        data-testid={`automation-token-revoke-${token.id}`}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog
        title="Create automation token"
        open={isCreateOpen}
        onClose={closeCreateDialog}
      >
        <div className="space-y-4 p-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Create automation token</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this token to authenticate an external agent without browser cookies.
            </p>
          </div>

          {createdToken ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                This token will not be shown again. Copy it now.
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Raw token</p>
                <div
                  className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-sm text-foreground"
                  data-testid="automation-token-raw-value"
                >
                  {createdToken.rawToken}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCopyToken} data-testid="automation-token-copy">
                  Copy token
                </Button>
                <Button variant="secondary" onClick={closeCreateDialog}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleCreate}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Token name</span>
                <Input
                  value={tokenName}
                  onChange={(event) => setTokenName(event.target.value)}
                  placeholder="OpenClaw - Home Mac"
                  data-testid="automation-token-name"
                  disabled={isPending}
                  autoFocus
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  isLoading={isPending}
                  loadingLabel="Creating..."
                  disabled={tokenName.trim().length === 0}
                  data-testid="automation-token-create-submit"
                >
                  Create
                </Button>
                <Button type="button" variant="secondary" onClick={closeCreateDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>

      <Dialog
        title="Revoke automation token"
        open={tokenToRevoke !== null}
        onClose={() => setTokenToRevoke(null)}
        panelClassName="sm:max-w-[520px]"
      >
        <div className="space-y-4 p-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Revoke token</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This will immediately block access for any agent using this token.
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {tokenToRevoke ? `Token: ${tokenToRevoke.name}` : "Selected token"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={handleConfirmRevoke}
              isLoading={isPending}
              loadingLabel="Revoking..."
              data-testid="automation-token-revoke-confirm"
            >
              Revoke token
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTokenToRevoke(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
