import "server-only";

import type { NotionDatabase, NotionPage } from "@/lib/notion/client";

const REQUIRED_PROPERTIES = {
  name: "Name",
  project: "Project",
} as const;

const OPTIONAL_PROPERTIES = {
  status: "Status",
  dueDate: "Due Date",
  notes: "Notes",
} as const;

type SupportedProjectPropertyType = "rich_text" | "select" | "title";
type SupportedStatusPropertyType = "checkbox" | "select" | "status";

export type ImportedNotionTask = {
  notionPageId: string;
  title: string;
  projectName: string;
  projectKey: string;
  completed: boolean;
  scheduledFor: string | null;
  archived: boolean;
  lastEditedAt: string | null;
};

export type ImportedNotionProject = {
  key: string;
  name: string;
};

function joinPlainText(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const plainText = (item as { plain_text?: unknown }).plain_text;
      return typeof plainText === "string" ? plainText : "";
    })
    .join("")
    .trim();
}

function getProperty(page: NotionPage, name: string) {
  const properties = page.properties ?? {};
  const property = properties[name];
  return property && typeof property === "object" ? (property as Record<string, unknown>) : null;
}

function getTextProperty(page: NotionPage, name: string) {
  const property = getProperty(page, name);
  if (!property) return "";

  const propertyType = typeof property.type === "string" ? property.type : null;
  if (propertyType === "title") return joinPlainText(property.title);
  if (propertyType === "rich_text") return joinPlainText(property.rich_text);

  return "";
}

function getProjectName(page: NotionPage) {
  const property = getProperty(page, REQUIRED_PROPERTIES.project);
  if (!property) return "";

  const propertyType = typeof property.type === "string" ? property.type : null;
  if (propertyType === "rich_text") return joinPlainText(property.rich_text);
  if (propertyType === "title") return joinPlainText(property.title);

  if (propertyType === "select") {
    const select = property.select;
    if (select && typeof select === "object" && typeof (select as { name?: unknown }).name === "string") {
      return ((select as { name: string }).name ?? "").trim();
    }
  }

  return "";
}

function isCompletedFromStatus(page: NotionPage) {
  const property = getProperty(page, OPTIONAL_PROPERTIES.status);
  if (!property) return false;

  const propertyType = typeof property.type === "string" ? property.type : null;

  if (propertyType === "checkbox") {
    return property.checkbox === true;
  }

  if (propertyType === "select") {
    const value = property.select;
    const name =
      value && typeof value === "object" && typeof (value as { name?: unknown }).name === "string"
        ? (value as { name: string }).name
        : "";
    return ["done", "complete", "completed"].includes(name.trim().toLowerCase());
  }

  if (propertyType === "status") {
    const value = property.status;
    const name =
      value && typeof value === "object" && typeof (value as { name?: unknown }).name === "string"
        ? (value as { name: string }).name
        : "";
    return ["done", "complete", "completed"].includes(name.trim().toLowerCase());
  }

  return false;
}

function getScheduledFor(page: NotionPage) {
  const property = getProperty(page, OPTIONAL_PROPERTIES.dueDate);
  if (!property || property.type !== "date") return null;

  const date = property.date;
  if (!date || typeof date !== "object") return null;

  const start = (date as { start?: unknown }).start;
  if (typeof start !== "string" || start.trim() === "") return null;

  return start.slice(0, 10);
}

export function buildProjectKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateNotionImportSchema(database: NotionDatabase): string | null {
  const properties = database.properties ?? {};
  const errors: string[] = [];

  const nameProperty = properties[REQUIRED_PROPERTIES.name];
  if (!nameProperty || nameProperty.type !== "title") {
    errors.push("Name (Title)");
  }

  const projectProperty = properties[REQUIRED_PROPERTIES.project];
  const projectType = projectProperty?.type as SupportedProjectPropertyType | undefined;
  if (!projectProperty || !["rich_text", "select", "title"].includes(projectType ?? "")) {
    errors.push("Project (Rich text, Select, or Title)");
  }

  const statusProperty = properties[OPTIONAL_PROPERTIES.status];
  if (statusProperty) {
    const statusType = statusProperty.type as SupportedStatusPropertyType | undefined;
    if (!["checkbox", "select", "status"].includes(statusType ?? "")) {
      errors.push("Status must be Checkbox, Select, or Status");
    }
  }

  const dueDateProperty = properties[OPTIONAL_PROPERTIES.dueDate];
  if (dueDateProperty && dueDateProperty.type !== "date") {
    errors.push("Due Date must be Date");
  }

  const notesProperty = properties[OPTIONAL_PROPERTIES.notes];
  if (notesProperty && notesProperty.type !== "rich_text") {
    errors.push("Notes must be Rich text");
  }

  if (errors.length === 0) {
    return null;
  }

  return `Notion database schema is invalid: ${errors.join(", ")}.`;
}

export function normalizeNotionTaskPage(page: NotionPage): ImportedNotionTask | null {
  const title = getTextProperty(page, REQUIRED_PROPERTIES.name).trim();
  const projectName = getProjectName(page).trim();

  if (!title || !projectName) {
    return null;
  }

  return {
    notionPageId: page.id,
    title,
    projectName,
    projectKey: buildProjectKey(projectName),
    completed: isCompletedFromStatus(page),
    scheduledFor: getScheduledFor(page),
    archived: page.archived === true || page.in_trash === true,
    lastEditedAt: typeof page.last_edited_time === "string" ? page.last_edited_time : null,
  };
}

export function collectImportedProjects(tasks: ImportedNotionTask[]): ImportedNotionProject[] {
  const projects = new Map<string, ImportedNotionProject>();

  tasks.forEach((task) => {
    if (!projects.has(task.projectKey)) {
      projects.set(task.projectKey, {
        key: task.projectKey,
        name: task.projectName,
      });
    }
  });

  return [...projects.values()];
}

export function computeMissingImportedIds(existingIds: string[], seenIds: Iterable<string>) {
  const seen = new Set(seenIds);
  return existingIds.filter((id) => !seen.has(id));
}
