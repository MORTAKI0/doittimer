"use client";

import * as React from "react";

import { getTabId, publishCrossTabEvent } from "@/lib/crossTab/channel";

const LEADER_KEY = "doittimer.focus.leader";
const HEARTBEAT_MS = 4000;
const STALE_MS = 12000;

type LeaderState = {
  tabId: string;
  ts: number;
  visibilityState: DocumentVisibilityState;
};

function parseLeader(raw: string | null): LeaderState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LeaderState>;
    if (typeof parsed.tabId !== "string" || typeof parsed.ts !== "number") {
      return null;
    }
    const visibilityState = parsed.visibilityState === "hidden" ? "hidden" : "visible";
    return { tabId: parsed.tabId, ts: parsed.ts, visibilityState };
  } catch {
    return null;
  }
}

function isLeaderFresh(leader: LeaderState | null) {
  if (!leader) return false;
  return Date.now() - leader.ts < STALE_MS;
}

function readLeader() {
  if (typeof window === "undefined") return null;
  return parseLeader(window.localStorage.getItem(LEADER_KEY));
}

function writeLeader(next: LeaderState, announce: boolean) {
  window.localStorage.setItem(LEADER_KEY, JSON.stringify(next));
  if (announce) {
    publishCrossTabEvent({
      type: "focus:leader_claim",
      routeHint: "/focus",
      entityType: "sessions",
      operation: "claim",
    });
  }
}

function clearLeaderIfOwned(tabId: string) {
  const leader = readLeader();
  if (!leader || leader.tabId !== tabId) return;
  window.localStorage.removeItem(LEADER_KEY);
}

export function useFocusLeader() {
  const tabId = React.useMemo(() => (typeof window === "undefined" ? "server" : getTabId()), []);
  const [isLeader, setIsLeader] = React.useState(false);

  const tryClaimLeadership = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (document.visibilityState !== "visible") return;

    const current = readLeader();
    const visibleAndFocused = document.visibilityState === "visible" && document.hasFocus();

    if (!current || !isLeaderFresh(current) || current.tabId === tabId || visibleAndFocused) {
      const next: LeaderState = {
        tabId,
        ts: Date.now(),
        visibilityState: document.visibilityState,
      };
      writeLeader(next, true);
      setIsLeader(true);
      return;
    }

    setIsLeader(current.tabId === tabId);
  }, [tabId]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    tryClaimLeadership();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LEADER_KEY) return;
      const nextLeader = parseLeader(event.newValue);
      setIsLeader(Boolean(nextLeader && nextLeader.tabId === tabId && isLeaderFresh(nextLeader)));

      if ((!nextLeader || !isLeaderFresh(nextLeader)) && document.visibilityState === "visible") {
        tryClaimLeadership();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tryClaimLeadership();
      } else {
        setIsLeader(false);
      }
    };

    const onFocus = () => {
      tryClaimLeadership();
    };

    const onBeforeUnload = () => {
      clearLeaderIfOwned(tabId);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const staleMonitor = window.setInterval(() => {
      const leader = readLeader();
      if ((!leader || !isLeaderFresh(leader)) && document.visibilityState === "visible") {
        tryClaimLeadership();
      } else {
        setIsLeader(Boolean(leader && leader.tabId === tabId && isLeaderFresh(leader)));
      }
    }, 2000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(staleMonitor);
      clearLeaderIfOwned(tabId);
    };
  }, [tabId, tryClaimLeadership]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !isLeader) return;

    const heartbeat = window.setInterval(() => {
      writeLeader({
        tabId,
        ts: Date.now(),
        visibilityState: document.visibilityState,
      }, false);
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [isLeader, tabId]);

  return { tabId, isLeader };
}
