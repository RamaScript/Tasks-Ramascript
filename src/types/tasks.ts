export type TaskStatus = "needsAction" | "completed";

export type FilterMode = "all" | "active" | "completed" | "today" | "overdue";

export type SyncStatus = "synced" | "syncing" | "error";

export interface TaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
  etag?: string;
}

export interface Task {
  id: string;
  listId?: string;
  title: string;
  notes?: string;
  due?: string;
  status: TaskStatus;
  completed?: string;
  updated?: string;
  position?: string;
  deleted?: boolean;
}

export interface UserProfile {
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthSession {
  accessToken: string;
  user: UserProfile;
  expiresAt?: number;
  isDemo?: boolean;
}
