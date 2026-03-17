"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  DEV_DIAGNOSTICS_ENABLED,
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics.client";

type FetchWithMetadata = typeof window.fetch & {
  __doitTimerInstrumented?: boolean;
};

function shouldTraceFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : null;
  const urlValue =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : request?.url ?? "";

  if (!urlValue) return false;

  const url = new URL(urlValue, window.location.origin);
  const headers = new Headers(init?.headers ?? request?.headers);
  const hasRscHeader = headers.get("rsc") === "1";

  return (
    url.origin === window.location.origin
    && (
      url.pathname === "/api/sessions/active"
      || url.pathname.startsWith("/_next/")
      || url.searchParams.has("_rsc")
      || hasRscHeader
    )
  );
}

function describeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = input instanceof Request ? input : null;
  const urlValue =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : request?.url ?? "";
  const url = new URL(urlValue, window.location.origin);
  const headers = new Headers(init?.headers ?? request?.headers);

  return {
    url: `${url.pathname}${url.search}`,
    method: init?.method ?? request?.method ?? "GET",
    isRsc:
      url.searchParams.has("_rsc")
      || headers.get("rsc") === "1"
      || url.pathname.startsWith("/_next/"),
    serviceWorkerControlled:
      "serviceWorker" in navigator && navigator.serviceWorker.controller != null,
  };
}

export function DevRuntimeDiagnostics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  React.useEffect(() => {
    if (!DEV_DIAGNOSTICS_ENABLED || typeof window === "undefined") {
      return;
    }

    logClientDiagnostic("runtime:mounted", getClientRuntimeSnapshot());

    const currentFetch = window.fetch as FetchWithMetadata;
    if (!currentFetch.__doitTimerInstrumented) {
      const originalFetch = window.fetch.bind(window);
      const instrumentedFetch: FetchWithMetadata = async (input, init) => {
        if (!shouldTraceFetch(input, init)) {
          return originalFetch(input, init);
        }

        const requestDetails = describeFetch(input, init);
        logClientDiagnostic("fetch:start", requestDetails);

        try {
          const response = await originalFetch(input, init);
          logClientDiagnostic("fetch:success", {
            ...requestDetails,
            ok: response.ok,
            status: response.status,
            redirected: response.redirected,
          });
          return response;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logClientDiagnostic("fetch:error", {
            ...requestDetails,
            message,
            ...getClientRuntimeSnapshot(),
          });
          throw error;
        }
      };

      instrumentedFetch.__doitTimerInstrumented = true;
      window.fetch = instrumentedFetch;
    }

    const handleOnline = () => {
      logClientDiagnostic("runtime:online", getClientRuntimeSnapshot());
    };
    const handleOffline = () => {
      logClientDiagnostic("runtime:offline", getClientRuntimeSnapshot());
    };
    const handleVisibility = () => {
      logClientDiagnostic("runtime:visibility", getClientRuntimeSnapshot());
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error
        ? { message: event.reason.message, stack: event.reason.stack ?? null }
        : { reason: String(event.reason) };
      logClientDiagnostic("runtime:unhandledrejection", {
        ...reason,
        ...getClientRuntimeSnapshot(),
      });
    };
    const handleError = (event: ErrorEvent) => {
      logClientDiagnostic("runtime:error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        ...getClientRuntimeSnapshot(),
      });
    };
    const handleServiceWorkerMessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      const type = (data as Record<string, unknown>).type;
      if (type !== "doittimer:sw-log") {
        return;
      }

      logClientDiagnostic("service-worker:event", {
        ...(data as Record<string, unknown>),
        ...getClientRuntimeSnapshot(),
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    document.addEventListener("visibilitychange", handleVisibility);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      document.removeEventListener("visibilitychange", handleVisibility);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!DEV_DIAGNOSTICS_ENABLED) {
      return;
    }

    logClientDiagnostic("navigation:location-change", {
      ...getClientRuntimeSnapshot(),
      pathname,
      search: searchKey ? `?${searchKey}` : "",
    });
  }, [pathname, searchKey]);

  return null;
}
