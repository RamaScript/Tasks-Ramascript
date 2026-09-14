import type { Task, TaskList } from "../types/tasks";

const BASE_URL = "https://tasks.googleapis.com/tasks/v1";

async function request<T>(
  accessToken: string,
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
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
  return (data.items ?? []).filter((task) => !task.deleted);
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
  return request<TaskList>(accessToken, `/lists/${listId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteTaskList(
  accessToken: string,
  listId: string,
): Promise<void> {
  await request<void>(accessToken, `/lists/${listId}`, {
    method: "DELETE",
  });
}

export async function createTask(
  accessToken: string,
  listId: string,
  payload: Partial<Task>,
): Promise<Task> {
  return request<Task>(accessToken, `/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title ?? "",
      notes: payload.notes ?? "",
      due: payload.due ?? "",
      status: payload.status ?? "needsAction",
    }),
  });
}

export async function updateTask(
  accessToken: string,
  listId: string,
  taskId: string,
  payload: Partial<Task>,
): Promise<Task> {
  return request<Task>(accessToken, `/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: payload.title,
      notes: payload.notes,
      due: payload.due,
      status: payload.status,
    }),
  });
}

export async function deleteTask(
  accessToken: string,
  listId: string,
  taskId: string,
): Promise<void> {
  await request<void>(accessToken, `/lists/${listId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}
