"use client";

import * as React from "react";

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isProd = process.env.NODE_ENV === "production";
    const enableDev = process.env.NEXT_PUBLIC_ENABLE_SW === "1";

    if (!isProd && !enableDev) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.info("Service worker registered", registration);
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  }, []);

  return null;
}
