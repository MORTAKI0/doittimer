import type { TaskPresentationMeta, TaskPriority } from "./types";
import { DEFAULT_TASK_PRIORITY } from "./types";

const STORAGE_KEY = "doittimer.task-presentation.v1";

type PresentationStore = Record<string, TaskPresentationMeta>;

type MergeableTask = {
  id: string;
  priority?: TaskPriority | null;
  description?: string | null;
  section_name?: string | null;
};

function readStore(): PresentationStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as PresentationStore;
  } catch {
    return {};
  }
}

function writeStore(next: PresentationStore) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors and continue with in-memory UI state.
  }
}

export function getTaskPresentationMeta(taskId: string): TaskPresentationMeta | null {
  const store = readStore();
  return store[taskId] ?? null;
}

export function saveTaskPresentationMeta(
  taskId: string,
  nextMeta: Partial<TaskPresentationMeta>,
) {
  const store = readStore();
  const previous = store[taskId] ?? {
    priority: DEFAULT_TASK_PRIORITY,
    description: "",
    sectionName: null,
  };

  store[taskId] = {
    priority: nextMeta.priority ?? previous.priority,
    description: nextMeta.description ?? previous.description,
    sectionName:
      nextMeta.sectionName === undefined ? previous.sectionName : nextMeta.sectionName,
  };

  writeStore(store);
}

export function mergeTaskPresentationMeta<T extends MergeableTask>(
  task: T,
): T & TaskPresentationMeta {
  const stored = getTaskPresentationMeta(task.id);

  return {
    ...task,
    priority: task.priority ?? stored?.priority ?? DEFAULT_TASK_PRIORITY,
    description: task.description ?? stored?.description ?? "",
    sectionName: task.section_name ?? stored?.sectionName ?? null,
  };
}
