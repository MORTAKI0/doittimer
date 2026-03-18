import { NextResponse } from "next/server";

export const AUTOMATION_ERROR_CODES = {
  unauthorized: "unauthorized",
  badRequest: "bad_request",
  internalError: "internal_error",
} as const;

export type AutomationErrorCode =
  (typeof AUTOMATION_ERROR_CODES)[keyof typeof AUTOMATION_ERROR_CODES];

type SuccessPayload<T> = {
  success: true;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
};

type ErrorPayload = {
  success: false;
  error: {
    code: AutomationErrorCode;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
};

const NO_STORE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function buildMeta(requestId?: string) {
  return {
    requestId: requestId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export function successResponse<T>(data: T, status = 200, requestId?: string) {
  const payload: SuccessPayload<T> = {
    success: true,
    data,
    meta: buildMeta(requestId),
  };

  return NextResponse.json(payload, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export function errorResponse(
  code: AutomationErrorCode,
  message: string,
  status: number,
  requestId?: string,
) {
  const payload: ErrorPayload = {
    success: false,
    error: {
      code,
      message,
    },
    meta: buildMeta(requestId),
  };

  return NextResponse.json(payload, {
    status,
    headers: NO_STORE_HEADERS,
  });
}
