export type TaskPriority = 1 | 2 | 3 | 4;

export const DEFAULT_TASK_PRIORITY: TaskPriority = 4;

export type TaskPresentationMeta = {
  priority: TaskPriority;
  description: string;
  sectionName: string | null;
};
