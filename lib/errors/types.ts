export type ErrorSeverity = "info" | "warn" | "error";

export type AppError = {
  code: string;
  message: string;
  retryable?: boolean;
  severity?: ErrorSeverity;
  meta?: Record<string, unknown>;
};
