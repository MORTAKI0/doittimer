import { mapError } from "@/lib/errors/mapError";

const LOG_PREFIX = "[doittimer]";

export type LogServerErrorInput = {
  scope: string;
  reqId?: string;
  userId?: string;
  error: unknown;
  context?: Record<string, unknown>;
};

export function logServerError({
  scope,
  reqId,
  userId,
  error,
  context,
}: LogServerErrorInput) {
  const mapped = mapError(error);

  if (mapped.code === "next_dynamic_server_usage") {
    return;
  }

  console.error({
    prefix: LOG_PREFIX,
    scope,
    reqId: reqId ?? null,
    userId: userId ?? null,
    code: mapped.code,
    message: mapped.message,
    retryable: mapped.retryable ?? false,
    severity: mapped.severity ?? "error",
    context: context ?? null,
    meta: mapped.meta ?? null,
  });
}
