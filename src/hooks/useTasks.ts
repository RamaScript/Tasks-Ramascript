import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  fetchTaskLists,
  fetchTasksForList,
  updateTask,
  updateTaskList,
} from "../services/googleTasks";
import type { FilterMode, SyncStatus, Task, TaskList } from "../types/tasks";

interface UseTasksOptions {
  accessToken: string | null;
}

export function useTasks({ accessToken }: UseTasksOptions) {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [error, setError] = useState<string | null>(null);

  const selectedListIdRef = useRef(selectedListId);
  useEffect(() => {
    selectedListIdRef.current = selectedListId;
  }, [selectedListId]);

  const fetchAll = useCallback(async () => {
    if (!accessToken) {
      setTaskLists([]);
      setTasks([]);
      setSelectedListId("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSyncStatus("syncing");

    try {
      const lists = await fetchTaskLists(accessToken);
      setTaskLists(lists);

      const nextSelectedListId =
        selectedListIdRef.current || lists[0]?.id || "";
      setSelectedListId(nextSelectedListId);

      if (nextSelectedListId) {
        const nextTasks = await fetchTasksForList(
          accessToken,
          nextSelectedListId,
        );
        setTasks(nextTasks);
      } else {
        setTasks([]);
      }

      setSyncStatus("synced");
    } catch (err) {
      const message = err instanceof Error ? err.message : "TASKS_LOAD_FAILED";
      setError(message);
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- one-time bootstrap on mount/auth change
    void fetchAll();
  }, [fetchAll]);

  const selectedList = useMemo(
    () => taskLists.find((list) => list.id === selectedListId) ?? null,
    [selectedListId, taskLists],
  );

  const setList = useCallback(
    async (listId: string) => {
      if (!accessToken || !listId) return;
      setSelectedListId(listId);
      setTasks([]);
      setLoading(true);
      setSyncStatus("syncing");
      try {
        const nextTasks = await fetchTasksForList(accessToken, listId);
        setTasks(nextTasks);
        setSyncStatus("synced");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "TASKS_LOAD_FAILED";
        setError(message);
        setSyncStatus("error");
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  const addTask = useCallback(
    async (title: string, extra?: Partial<Task>) => {
      if (!accessToken || !selectedListId || !title.trim()) return;

      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        title: title.trim(),
        status: "needsAction",
        notes: extra?.notes ?? "",
        due: extra?.due ?? "",
      };

      setTasks((current) => [optimisticTask, ...current]);
      setSyncStatus("syncing");
      setError(null);

      try {
        const created = await createTask(accessToken, selectedListId, {
          title: optimisticTask.title,
          notes: optimisticTask.notes,
          due: optimisticTask.due,
          status: optimisticTask.status,
        });
        setTasks((current) =>
          current.map((task) =>
            task.id === optimisticTask.id ? created : task,
          ),
        );
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) =>
          current.filter((task) => task.id !== optimisticTask.id),
        );
        const message =
          err instanceof Error ? err.message : "TASK_CREATE_FAILED";
        setError(message);
        setSyncStatus("error");
      }
    },
    [accessToken, selectedListId],
  );

  const updateTaskById = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!accessToken || !selectedListId) return;

      const currentTask = tasks.find((task) => task.id === taskId);
      if (!currentTask) return;

      const optimistic = { ...currentTask, ...updates };
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? optimistic : task)),
      );
      setSyncStatus("syncing");
      setError(null);

      try {
        const nextTask = await updateTask(
          accessToken,
          selectedListId,
          taskId,
          updates,
        );
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? nextTask : task)),
        );
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? currentTask : task)),
        );
        const message =
          err instanceof Error ? err.message : "TASK_UPDATE_FAILED";
        setError(message);
        setSyncStatus("error");
      }
    },
    [accessToken, selectedListId, tasks],
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      if (!accessToken || !selectedListId) return;
      const currentTask = tasks.find((task) => task.id === taskId);
      if (!currentTask) return;

      setTasks((current) => current.filter((task) => task.id !== taskId));
      setSyncStatus("syncing");
      setError(null);

      try {
        await deleteTask(accessToken, selectedListId, taskId);
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) => [currentTask, ...current]);
        const message =
          err instanceof Error ? err.message : "TASK_DELETE_FAILED";
        setError(message);
        setSyncStatus("error");
      }
    },
    [accessToken, selectedListId, tasks],
  );

  const addList = useCallback(
    async (title: string) => {
      if (!accessToken || !title.trim()) return;

      try {
        const created = await createTaskList(accessToken, title.trim());
        setTaskLists((current) => [created, ...current]);
        setSelectedListId(created.id);
        setTasks([]);
        setSyncStatus("synced");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "LIST_CREATE_FAILED";
        setError(message);
        setSyncStatus("error");
      }
    },
    [accessToken],
  );

  const renameList = useCallback(
    async (listId: string, title: string) => {
      if (!accessToken || !listId || !title.trim()) return;
      try {
        const updated = await updateTaskList(accessToken, listId, title.trim());
        setTaskLists((current) =>
          current.map((list) =>
            list.id === listId ? { ...list, title: updated.title } : list,
          ),
        );
        setSyncStatus("synced");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "LIST_RENAME_FAILED";
        setError(message);
        setSyncStatus("error");
      }
    },
    [accessToken],
  );

  const removeList = useCallback(
    async (listId: string) => {
      if (!accessToken || !listId) return;
      try {
        await deleteTaskList(accessToken, listId);
        setTaskLists((current) => current.filter((list) => list.id !== listId));
        if (selectedListId === listId) {
          const fallback = taskLists.find((list) => list.id !== listId);
          if (fallback) {
            await setList(fallback.id);
          } else {
            setSelectedListId("");
            setTasks([]);
          }
        }
        setSyncStatus("synced");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "LIST_DELETE_FAILED";
        setError(message);
        setSyncStatus("error");
      }
    },
    [accessToken, setList, selectedListId, taskLists],
  );

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "needsAction"),
    [tasks],
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "completed"),
    [tasks],
  );

  const dueTodayTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((task) => {
      if (!task.due || task.status === "completed") return false;
      const dueDate = new Date(task.due);
      return dueDate.toDateString() === today.toDateString();
    });
  }, [tasks]);

  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.due || task.status === "completed") return false;
        const dueDate = new Date(task.due);
        return dueDate < new Date(new Date().setHours(0, 0, 0, 0));
      }),
    [tasks],
  );

  const listStats = useMemo(
    () => ({
      all: tasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      today: dueTodayTasks.length,
      overdue: overdueTasks.length,
    }),
    [
      activeTasks.length,
      completedTasks.length,
      dueTodayTasks.length,
      overdueTasks.length,
      tasks.length,
    ],
  );

  const getFilteredTasks = useCallback(
    (filter: FilterMode) => {
      switch (filter) {
        case "active":
          return activeTasks;
        case "completed":
          return completedTasks;
        case "today":
          return dueTodayTasks;
        case "overdue":
          return overdueTasks;
        default:
          return tasks;
      }
    },
    [activeTasks, completedTasks, dueTodayTasks, overdueTasks, tasks],
  );

  return {
    taskLists,
    selectedListId,
    selectedList,
    tasks,
    loading,
    error,
    syncStatus,
    listStats,
    setList,
    addTask,
    updateTaskById,
    removeTask,
    addList,
    renameList,
    removeList,
    getFilteredTasks,
    fetchAll,
  };
}