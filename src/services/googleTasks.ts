import type { Task, TaskList } from "../types/tasks";

const BASE_URL = "https://tasks.googleapis.com/tasks/v1";

export function toRFC3339Date(dateStr?: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
  }
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString();
  }
  return undefined;
}

export function toInputDateFormat(dateStr?: string): string {
  if (!dateStr) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

async function request<T>(
  accessToken: string,
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  if (!accessToken || !accessToken.trim()) {
    throw new Error("UNAUTHENTICATED: No valid access token provided.");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    let isAuthError = response.status === 401;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
      const errorStatus = parsed.error?.status ?? "";
      const reason = parsed.error?.errors?.[0]?.reason ?? parsed.error?.details?.[0]?.reason ?? "";

      if (
        response.status === 401 ||
        parsed.error?.code === 401 ||
        errorStatus === "UNAUTHENTICATED" ||
        reason === "required" ||
        reason === "CREDENTIALS_MISSING"
      ) {
        isAuthError = true;
      } else if (
        response.status === 403 &&
        (reason === "insufficientPermissions" ||
          reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" ||
          errorStatus === "PERMISSION_DENIED" ||
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("scope"))
      ) {
        isAuthError = true;
      } else if (
        reason === "SERVICE_DISABLED" ||
        message.includes("Google Tasks API has not been used") ||
        message.includes("is disabled")
      ) {
        message =
          "GOOGLE_TASKS_API_DISABLED: Google Tasks API is not enabled in your Google Cloud project. Please enable it in Google Cloud Console: https://console.developers.google.com/apis/api/tasks.googleapis.com/overview";
      } else if (
        response.status === 403 &&
        (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded")
      ) {
        message = "RATE_LIMIT_EXCEEDED: Google Tasks API rate limit reached. Please wait a moment before syncing.";
      }
    } catch {
      // Keep raw message if not JSON
    }

    if (isAuthError) {
      throw new Error(`UNAUTHENTICATED: ${message}`);
    }

    throw new Error(message || "GOOGLE_TASKS_REQUEST_FAILED");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchTaskLists(accessToken: string): Promise<TaskList[]> {
  const data = await request<{ items?: TaskList[] }>(
    accessToken,
    "/users/@me/lists",
  );
  return data.items ?? [];
}

export async function fetchTasksForList(
  accessToken: string,
  listId: string,
): Promise<Task[]> {
  const data = await request<{ items?: Task[] }>(
    accessToken,
    `/lists/${listId}/tasks`,
  );
  return (data.items ?? [])
    .filter((task) => !task.deleted)
    .map((task) => ({ ...task, listId }));
}

export async function createTaskList(
  accessToken: string,
  title: string,
): Promise<TaskList> {
  return request<TaskList>(accessToken, "/users/@me/lists", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateTaskList(
  accessToken: string,
  listId: string,
  title: string,
): Promise<TaskList> {
  return request<TaskList>(accessToken, `/users/@me/lists/${listId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteTaskList(
  accessToken: string,
  listId: string,
): Promise<void> {
  try {
    await request<void>(accessToken, `/users/@me/lists/${listId}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("404") || err.message.includes("notFound"))
    ) {
      return;
    }
    throw err;
  }
}

export async function createTask(
  accessToken: string,
  listId: string,
  payload: Partial<Task>,
): Promise<Task> {
  const body: Record<string, unknown> = {
    title: payload.title?.trim() ?? "",
    status: payload.status ?? "needsAction",
  };

  if (payload.notes && payload.notes.trim()) {
    body.notes = payload.notes.trim();
  }

  const formattedDue = toRFC3339Date(payload.due);
  if (formattedDue) {
    body.due = formattedDue;
  }

  const created = await request<Task>(accessToken, `/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { ...created, listId };
}

export async function updateTask(
  accessToken: string,
  listId: string,
  taskId: string,
  payload: Partial<Task>,
): Promise<Task> {
  const body: Record<string, unknown> = {};

  if (payload.title !== undefined) body.title = payload.title;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.due !== undefined) {
    const formatted = toRFC3339Date(payload.due);
    body.due = formatted ?? null;
  }

  const updated = await request<Task>(
    accessToken,
    `/lists/${listId}/tasks/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return { ...updated, listId };
}

export async function deleteTask(
  accessToken: string,
  listId: string,
  taskId: string,
): Promise<void> {
  try {
    await request<void>(accessToken, `/lists/${listId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("404") || err.message.includes("notFound"))
    ) {
      return;
    }
    throw err;
  }
}

export async function moveTaskBetweenLists(
  accessToken: string,
  sourceListId: string,
  targetListId: string,
  task: Task,
): Promise<Task> {
  const created = await createTask(accessToken, targetListId, {
    title: task.title,
    notes: task.notes,
    due: task.due,
    status: task.status,
  });
  await deleteTask(accessToken, sourceListId, task.id);
  return created;
}

