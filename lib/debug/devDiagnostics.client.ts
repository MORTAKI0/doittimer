export const DEV_DIAGNOSTICS_ENABLED = process.env.NODE_ENV !== "production";
const CLIENT_PREFIX = "[dev-diag]";

export type DiagnosticPayload = Record<string, unknown>;
export type ClientDiagnosticEntry = {
  event: string;
  ts: string;
} & DiagnosticPayload;

declare global {
  interface Window {
    __DOITTIMER_DEV_DIAGNOSTICS__?: ClientDiagnosticEntry[];
  }
}

function nowIso() {
  return new Date().toISOString();
}

export function logClientDiagnostic(event: string, payload: DiagnosticPayload = {}) {
  if (!DEV_DIAGNOSTICS_ENABLED || typeof window === "undefined") {
    return;
  }

  const entry: ClientDiagnosticEntry = {
    event,
    ts: nowIso(),
    ...payload,
  };

  const nextEntries = window.__DOITTIMER_DEV_DIAGNOSTICS__ ?? [];
  nextEntries.push(entry);
  window.__DOITTIMER_DEV_DIAGNOSTICS__ = nextEntries.slice(-200);

  console.info(CLIENT_PREFIX, entry);
}

export function getClientRuntimeSnapshot() {
  if (typeof window === "undefined") {
    return {
      pathname: null,
      search: null,
      visibilityState: null,
      online: null,
      serviceWorkerControlled: null,
    };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    visibilityState: document.visibilityState,
    online: navigator.onLine,
    serviceWorkerControlled:
      "serviceWorker" in navigator && navigator.serviceWorker.controller != null,
  };
}
