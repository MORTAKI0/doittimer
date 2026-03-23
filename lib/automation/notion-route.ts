import { getAutomationRouteContext } from "@/lib/automation/task-route";
import {
  AUTOMATION_ERROR_CODES,
  errorResponse,
  successResponse,
} from "@/lib/automation/response";
import type {
  NotionConnectionSummary,
  NotionServiceErrorCode,
  NotionServiceResult,
  NotionSyncSummary,
} from "@/lib/services/notion";

function toWarnings(count: number) {
  if (count <= 0) {
    return [];
  }

  return [`Skipped ${count} Notion page(s) that did not match the import schema.`];
}

export function toAgentNotionConnection(summary: NotionConnectionSummary) {
  return {
    connected: summary.connected,
    databaseName: summary.workspace_name,
    lastSyncedAt: summary.last_synced_at,
  };
}

export function toAgentNotionSyncSummary(summary: NotionSyncSummary) {
  return {
    projectsImported:
      summary.createdProjects + summary.updatedProjects + summary.restoredProjects,
    tasksImported: summary.createdTasks + summary.updatedTasks + summary.restoredTasks,
    projectsArchived: summary.archivedProjects,
    tasksArchived: summary.archivedTasks,
    warnings: toWarnings(summary.warnings),
  };
}

function toNotionErrorResponse(code: NotionServiceErrorCode | undefined, message: string) {
  if (code === "not_connected") {
    return errorResponse(AUTOMATION_ERROR_CODES.conflict, message, 409);
  }

  if (code === "validation_error") {
    return errorResponse(AUTOMATION_ERROR_CODES.badRequest, message, 400);
  }

  if (code === "upstream_error") {
    return errorResponse(AUTOMATION_ERROR_CODES.upstreamError, message, 502);
  }

  return errorResponse(AUTOMATION_ERROR_CODES.internalError, message, 500);
}

export function toNotionConnectionAutomationResponse(
  result: NotionServiceResult<NotionConnectionSummary>,
) {
  if (result.success) {
    return successResponse(toAgentNotionConnection(result.data));
  }

  return toNotionErrorResponse(result.code, result.error);
}

export function toNotionSyncAutomationResponse(
  result: NotionServiceResult<NotionSyncSummary>,
) {
  if (result.success) {
    return successResponse(toAgentNotionSyncSummary(result.data));
  }

  return toNotionErrorResponse(result.code, result.error);
}

export { getAutomationRouteContext };
