export type QueueItem = {
  task_id: string;
  title: string;
  archived_at: string | null;
};

export function getNextUpTask(
  queue: QueueItem[],
  activeTaskId: string | null,
): QueueItem | null {
  if (!queue.length) return null;
  if (!activeTaskId) return queue[0] ?? null;
  const next = queue.find((item) => item.task_id !== activeTaskId);
  return next ?? queue[0] ?? null;
}
