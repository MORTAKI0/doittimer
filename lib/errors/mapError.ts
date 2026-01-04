import type { AppError } from "./types";

const AUTH_REQUIRED_MESSAGE = "You must be signed in to continue.";
const NETWORK_ERROR_MESSAGE = "Network error. Check your connection and try again.";
const FORBIDDEN_MESSAGE = "You do not have permission to do that.";
const NOT_FOUND_MESSAGE = "We could not find what you were looking for.";
const REQUEST_FAILED_MESSAGE = "Unable to complete the request. Please try again.";
const UNKNOWN_ERROR_MESSAGE = "Something went wrong. Please try again.";

const NETWORK_PATTERNS = [
  "fetch failed",
  "timeout",
  "connect",
  "und_err_connect_timeout",
  "networkerror",
  "failed to fetch",
];

const AUTH_PATTERNS = [
  "jwt",
  "token",
  "not authenticated",
  "auth session missing",
  "invalid login",
  "unauthorized",
  "missing authorization",
];

const FORBIDDEN_PATTERNS = [
  "permission denied",
  "not allowed",
  "insufficient privilege",
  "forbidden",
];

const NOT_FOUND_PATTERNS = ["not found", "does not exist"];

type ErrorShape = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  name?: unknown;
};

type SupabaseErrorLike = ErrorShape & {
  message: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapError(input: unknown): unknown {
  if (!isObject(input)) return input;
  if ("error" in input && isObject(input.error)) {
    return input.error;
  }
  if ("error" in input && typeof input.error === "string") {
    return new Error(input.error);
  }
  return input;
}

function extractMessage(err: unknown): string | null {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (isObject(err) && typeof err.message === "string") return err.message;
  return null;
}

function extractCode(err: unknown): string | null {
  if (isObject(err) && typeof err.code === "string") return err.code;
  return null;
}

function extractStatus(err: unknown): number | null {
  if (isObject(err) && typeof err.status === "number" && Number.isFinite(err.status)) {
    return err.status;
  }
  return null;
}

function extractDetails(err: unknown): string | null {
  if (isObject(err) && typeof err.details === "string") return err.details;
  return null;
}

function extractHint(err: unknown): string | null {
  if (isObject(err) && typeof err.hint === "string") return err.hint;
  return null;
}

function isSupabaseError(err: unknown): err is SupabaseErrorLike {
  if (!isObject(err) || typeof err.message !== "string") return false;
  return (
    typeof err.code === "string" ||
    typeof err.details === "string" ||
    typeof err.hint === "string" ||
    typeof err.status === "number"
  );
}

function hasMessageMatch(err: unknown, patterns: string[]): boolean {
  const message = extractMessage(err)?.toLowerCase();
  if (!message) return false;
  return patterns.some((pattern) => message.includes(pattern));
}

function compactMeta(meta: Record<string, unknown>): Record<string, unknown> | undefined {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function mapSupabaseError(err: SupabaseErrorLike): AppError {
  const code = extractCode(err);
  const status = extractStatus(err);

  if (status === 401 || code === "PGRST301" || hasMessageMatch(err, AUTH_PATTERNS)) {
    return {
      code: "auth_required",
      message: AUTH_REQUIRED_MESSAGE,
      severity: "info",
      retryable: false,
      meta: compactMeta({
        supabaseCode: code,
        supabaseMessage: err.message,
        supabaseDetails: extractDetails(err),
        supabaseHint: extractHint(err),
        status,
      }),
    };
  }

  if (status === 403 || code === "42501" || hasMessageMatch(err, FORBIDDEN_PATTERNS)) {
    return {
      code: "forbidden",
      message: FORBIDDEN_MESSAGE,
      severity: "warn",
      retryable: false,
      meta: compactMeta({
        supabaseCode: code,
        supabaseMessage: err.message,
        supabaseDetails: extractDetails(err),
        supabaseHint: extractHint(err),
        status,
      }),
    };
  }

  return {
    code: "rpc_error",
    message: REQUEST_FAILED_MESSAGE,
    severity: "error",
    retryable: false,
    meta: compactMeta({
      supabaseCode: code,
      supabaseMessage: err.message,
      supabaseDetails: extractDetails(err),
      supabaseHint: extractHint(err),
      status,
    }),
  };
}

export function mapError(input: unknown): AppError {
  const err = unwrapError(input);

  if (hasMessageMatch(err, NETWORK_PATTERNS)) {
    return {
      code: "network_error",
      message: NETWORK_ERROR_MESSAGE,
      retryable: true,
      severity: "warn",
      meta: compactMeta({
        rawMessage: extractMessage(err),
        status: extractStatus(err),
      }),
    };
  }

  if (isSupabaseError(err)) {
    return mapSupabaseError(err);
  }

  if (hasMessageMatch(err, AUTH_PATTERNS)) {
    return {
      code: "auth_required",
      message: AUTH_REQUIRED_MESSAGE,
      severity: "info",
      retryable: false,
      meta: compactMeta({ rawMessage: extractMessage(err) }),
    };
  }

  if (hasMessageMatch(err, FORBIDDEN_PATTERNS)) {
    return {
      code: "forbidden",
      message: FORBIDDEN_MESSAGE,
      severity: "warn",
      retryable: false,
      meta: compactMeta({ rawMessage: extractMessage(err) }),
    };
  }

  if (hasMessageMatch(err, NOT_FOUND_PATTERNS)) {
    return {
      code: "not_found",
      message: NOT_FOUND_MESSAGE,
      severity: "info",
      retryable: false,
      meta: compactMeta({ rawMessage: extractMessage(err) }),
    };
  }

  if (err instanceof Error) {
    return {
      code: "unknown_error",
      message: UNKNOWN_ERROR_MESSAGE,
      severity: "error",
      retryable: false,
      meta: compactMeta({
        rawMessage: err.message,
        name: err.name,
      }),
    };
  }

  if (typeof err === "string") {
    return {
      code: "unknown_error",
      message: UNKNOWN_ERROR_MESSAGE,
      severity: "error",
      retryable: false,
      meta: compactMeta({ rawMessage: err }),
    };
  }

  return {
    code: "unknown_error",
    message: UNKNOWN_ERROR_MESSAGE,
    severity: "error",
    retryable: false,
  };
}

export function toPublicMessage(input: unknown): string {
  return mapError(input).message;
}

export function isRetryable(input: unknown): boolean {
  return mapError(input).retryable ?? false;
}
