import "server-only";

const NOTION_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const MAX_RETRIES = 3;

export type NotionPropertyValue = Record<string, unknown>;

export type NotionDatabase = {
  id: string;
  properties: Record<
    string,
    {
      type: string;
      select?: { options?: Array<{ name?: string }> };
    }
  >;
};

export type NotionPage = {
  id: string;
  last_edited_time?: string;
  properties?: Record<string, unknown>;
};

export class NotionApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "NotionApiError";
    this.status = status;
    this.code = code;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return parsed * 1000;
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

async function requestNotion<T>(
  path: string,
  token: string,
  options: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<T> {
  const url = `${NOTION_BASE_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const errorPayload = await safeParseJson(response);
      const message =
        typeof errorPayload?.message === "string"
          ? errorPayload.message
          : `Notion API error (${response.status})`;

      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        const retryAfterMs =
          response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : null;
        const backoffMs = retryAfterMs ?? 200 * attempt;
        await sleep(backoffMs);
        continue;
      }

      throw new NotionApiError(message, response.status, errorPayload?.code);
    } catch (error) {
      lastError = error;
      if (error instanceof NotionApiError) {
        throw error;
      }
      if (attempt < MAX_RETRIES) {
        await sleep(200 * attempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new NotionApiError("Notion API request failed.", 500);
}

async function safeParseJson(response: Response): Promise<{ message?: string; code?: string } | null> {
  try {
    return (await response.json()) as { message?: string; code?: string };
  } catch {
    return null;
  }
}

export async function getDatabase({
  token,
  databaseId,
}: {
  token: string;
  databaseId: string;
}): Promise<NotionDatabase> {
  return requestNotion<NotionDatabase>(`/databases/${databaseId}`, token, {
    method: "GET",
  });
}

export async function queryDatabaseByAppId({
  token,
  databaseId,
  appId,
}: {
  token: string;
  databaseId: string;
  appId: string;
}): Promise<NotionPage | null> {
  const response = await requestNotion<{ results: Array<NotionPage> }>(
    `/databases/${databaseId}/query`,
    token,
    {
      method: "POST",
      body: {
        page_size: 1,
        filter: {
          property: "App ID",
          rich_text: {
            equals: appId,
          },
        },
      },
    },
  );

  const first = response.results?.[0];
  return first ?? null;
}

export async function queryDatabase({
  token,
  databaseId,
  filter,
}: {
  token: string;
  databaseId: string;
  filter?: Record<string, unknown>;
}): Promise<NotionPage[]> {
  let cursor: string | null = null;
  const results: NotionPage[] = [];

  while (true) {
    const response: {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    } = await requestNotion(`/databases/${databaseId}/query`, token, {
      method: "POST",
      body: {
        page_size: 100,
        filter,
        start_cursor: cursor ?? undefined,
      },
    });

    results.push(...(response.results ?? []));
    if (!response.has_more || !response.next_cursor) {
      break;
    }
    cursor = response.next_cursor;
  }

  return results;
}

export async function createPage({
  token,
  databaseId,
  properties,
}: {
  token: string;
  databaseId: string;
  properties: Record<string, NotionPropertyValue>;
}): Promise<NotionPage> {
  return requestNotion<NotionPage>("/pages", token, {
    method: "POST",
    body: {
      parent: { database_id: databaseId },
      properties,
    },
  });
}

export async function updatePage({
  token,
  pageId,
  properties,
}: {
  token: string;
  pageId: string;
  properties: Record<string, NotionPropertyValue>;
}): Promise<NotionPage> {
  return requestNotion<NotionPage>(`/pages/${pageId}`, token, {
    method: "PATCH",
    body: {
      properties,
    },
  });
}
