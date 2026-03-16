"use client";

import * as React from "react";

import {
  DEV_DIAGNOSTICS_ENABLED,
  getClientRuntimeSnapshot,
  logClientDiagnostic,
} from "@/lib/debug/devDiagnostics";

const DEV_RESET_SESSION_KEY = "doittimer:dev-sw-reset";
const CACHE_PREFIXES = ["doittimer-static-"];

async function clearDevServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const unregisterResults = await Promise.all(
    registrations.map(async (registration) => {
      try {
        return await registration.unregister();
      } catch {
        return false;
      }
    }),
  );

  const cacheKeys = typeof window !== "undefined" && "caches" in window
    ? await window.caches.keys()
    : [];
  const matchingCacheKeys = cacheKeys.filter((key) =>
    CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );

  await Promise.all(matchingCacheKeys.map((key) => window.caches.delete(key)));

  return {
    hadRegistrations: registrations.length > 0,
    unregistered: unregisterResults.some(Boolean),
    clearedCaches: matchingCacheKeys.length > 0,
  };
}

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isProd = process.env.NODE_ENV === "production";
    const handleControllerChange = () => {
      logClientDiagnostic("service-worker:controllerchange", getClientRuntimeSnapshot());
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    if (!isProd) {
      logClientDiagnostic("service-worker:dev-cleanup:start", getClientRuntimeSnapshot());
      void clearDevServiceWorkers().then(({ hadRegistrations, unregistered, clearedCaches }) => {
        logClientDiagnostic("service-worker:dev-cleanup:result", {
          hadRegistrations,
          unregistered,
          clearedCaches,
          ...getClientRuntimeSnapshot(),
        });

        const needsReload =
          navigator.serviceWorker.controller != null
          && (hadRegistrations || unregistered || clearedCaches)
          && window.sessionStorage.getItem(DEV_RESET_SESSION_KEY) !== "1";

        if (needsReload) {
          logClientDiagnostic("service-worker:dev-cleanup:reload", getClientRuntimeSnapshot());
          window.sessionStorage.setItem(DEV_RESET_SESSION_KEY, "1");
          window.location.reload();
          return;
        }

        window.sessionStorage.removeItem(DEV_RESET_SESSION_KEY);
      });
      return () => {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }

    logClientDiagnostic("service-worker:register:start", getClientRuntimeSnapshot());
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        logClientDiagnostic("service-worker:register:success", {
          scope: registration.scope,
          activeState: registration.active?.state ?? null,
          waitingState: registration.waiting?.state ?? null,
          installingState: registration.installing?.state ?? null,
          ...getClientRuntimeSnapshot(),
        });
      })
      .catch((error) => {
        logClientDiagnostic("service-worker:register:error", {
          message: error instanceof Error ? error.message : String(error),
          ...getClientRuntimeSnapshot(),
        });
      });

    if (DEV_DIAGNOSTICS_ENABLED && navigator.serviceWorker.controller) {
      logClientDiagnostic("service-worker:controller:present", getClientRuntimeSnapshot());
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
