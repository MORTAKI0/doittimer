const CHANNEL_NAME = "doittimer";
const STORAGE_PING_KEY = "doittimer.crossTab.ping";

type FocusEventType =
  | "focus:session_changed"
  | "focus:pomodoro_changed"
  | "focus:queue_changed"
  | "focus:leader_claim";

type FocusEventOperation =
  | "start"
  | "stop"
  | "edit"
  | "manual_add"
  | "pause"
  | "resume"
  | "skip"
  | "restart"
  | "update"
  | "claim";

export type DoItTimerCrossTabEvent = {
  type: FocusEventType;
  eventId: string;
  sourceTabId: string;
  ts: number;
  routeHint?: string;
  entityType?: "sessions" | "tasks" | "task_queue_items";
  entityId?: string;
  operation?: FocusEventOperation;
};

type EventListener = (event: DoItTimerCrossTabEvent) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<EventListener>();
let storageListenerAttached = false;
let channelListenerAttached = false;

function getOrCreateBroadcastChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

function parseEvent(raw: unknown): DoItTimerCrossTabEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<DoItTimerCrossTabEvent>;
  if (typeof candidate.type !== "string") return null;
  if (typeof candidate.eventId !== "string") return null;
  if (typeof candidate.sourceTabId !== "string") return null;
  if (typeof candidate.ts !== "number") return null;
  return candidate as DoItTimerCrossTabEvent;
}

function emit(event: DoItTimerCrossTabEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function ensureListeners() {
  if (typeof window === "undefined") return;

  const bc = getOrCreateBroadcastChannel();
  if (bc && !channelListenerAttached) {
    bc.addEventListener("message", (payload) => {
      const parsed = parseEvent(payload.data);
      if (!parsed) return;
      emit(parsed);
    });
    channelListenerAttached = true;
  }

  if (!storageListenerAttached) {
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_PING_KEY || !event.newValue) return;
      try {
        const parsed = parseEvent(JSON.parse(event.newValue));
        if (!parsed) return;
        emit(parsed);
      } catch {
        // Ignore malformed cross-tab payloads.
      }
    });
    storageListenerAttached = true;
  }
}

export function getTabId() {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem("doittimer.tabId");
  if (existing) return existing;

  const created = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem("doittimer.tabId", created);
  return created;
}

export function publishCrossTabEvent(event: Omit<DoItTimerCrossTabEvent, "eventId" | "sourceTabId" | "ts">) {
  if (typeof window === "undefined") return;

  const payload: DoItTimerCrossTabEvent = {
    ...event,
    eventId: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    sourceTabId: getTabId(),
    ts: Date.now(),
  };

  const bc = getOrCreateBroadcastChannel();
  if (bc) {
    bc.postMessage(payload);
  }

  try {
    window.localStorage.setItem(STORAGE_PING_KEY, JSON.stringify(payload));
    window.localStorage.removeItem(STORAGE_PING_KEY);
  } catch {
    // Ignore quota or privacy-mode restrictions on localStorage.
  }
}

export function subscribeCrossTabEvents(listener: EventListener) {
  if (typeof window === "undefined") return () => undefined;

  ensureListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
