import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  fetchTaskLists,
  fetchTasksForList,
  moveTaskBetweenLists,
  toRFC3339Date,
  updateTask,
  updateTaskList,
} from "../services/googleTasks";
import type { FilterMode, SyncStatus, Task, TaskList } from "../types/tasks";

interface UseTasksOptions {
  accessToken: string | null;
  isDemo?: boolean;
  onAuthExpired?: () => void;
}

const DEMO_LISTS_STORAGE_KEY = "tasko-demo-lists";
const DEMO_TASKS_STORAGE_KEY = "tasko-demo-tasks";

const DEFAULT_DEMO_LISTS: TaskList[] = [
  { id: "demo-focus", title: "FOCUS // SPRINT" },
  { id: "demo-system", title: "SYSTEM ARCHITECTURE" },
  { id: "demo-life", title: "PERSONAL // LOGS" },
];

function getInitialDemoTasks(): Record<string, Task[]> {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const overdueStr = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()).toISOString();

  return {
    "demo-focus": [
      {
        id: "demo-t1",
        title: "Overhaul Google Tasks Neo-Brutalist UI",
        notes: "Tactile high-contrast design with responsive layout, quick date chips, and keyboard navigation.",
        status: "needsAction",
        due: todayStr,
      },
      {
        id: "demo-t2",
        title: "Audit Authorized JavaScript Origins in GCP",
        notes: "Verify http://localhost:5173 and production Vercel domains are registered in OAuth Client settings.",
        status: "needsAction",
        due: overdueStr,
      },
      {
        id: "demo-t3",
        title: "Ship RFC 3339 Date Serializer & Deserializer",
        notes: "Prevents empty due date string 400 Bad Request error on Google Tasks API.",
        status: "completed",
        due: todayStr,
      },
      {
        id: "demo-t4",
        title: "Deploy Vercel Production Build",
        notes: "Run full TypeScript validation and preview performance.",
        status: "needsAction",
        due: tomorrowStr,
      },
    ],
    "demo-system": [
      {
        id: "demo-t5",
        title: "Configure OAuth consent screen test users",
        notes: "Add personal Gmail accounts while app status is in 'Testing' phase.",
        status: "needsAction",
        due: tomorrowStr,
      },
      {
        id: "demo-t6",
        title: "Dark mode contrast ratio calibration",
        notes: "Refine charcoal borders to eliminate high-contrast glare.",
        status: "completed",
      },
    ],
    "demo-life": [
      {
        id: "demo-t7",
        title: "Order tactile mechanical keyboard switches",
        notes: "High-contrast cyber yellow keycaps.",
        status: "needsAction",
      },
    ],
  };
}

export function useTasks({ accessToken, isDemo, onAuthExpired }: UseTasksOptions) {
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

  // Demo storage helpers
  const getDemoLists = useCallback((): TaskList[] => {
    try {
      const raw = localStorage.getItem(DEMO_LISTS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return DEFAULT_DEMO_LISTS;
  }, []);

  const saveDemoLists = useCallback((lists: TaskList[]) => {
    localStorage.setItem(DEMO_LISTS_STORAGE_KEY, JSON.stringify(lists));
  }, []);

  const getDemoTasksMap = useCallback((): Record<string, Task[]> => {
    try {
      const raw = localStorage.getItem(DEMO_TASKS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return getInitialDemoTasks();
  }, []);

  const saveDemoTasksMap = useCallback((map: Record<string, Task[]>) => {
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(map));
  }, []);

  const handleApiError = useCallback(
    (err: unknown, defaultMessage: string) => {
      const message = err instanceof Error ? err.message : defaultMessage;
      if (message.includes("UNAUTHENTICATED") || message.includes("401")) {
        onAuthExpired?.();
      }
      setError(message);
      setSyncStatus("error");
    },
    [onAuthExpired],
  );

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

    if (isDemo) {
      const lists = getDemoLists();
      setTaskLists(lists);
      const nextSelectedListId =
        selectedListIdRef.current || lists[0]?.id || "";
      setSelectedListId(nextSelectedListId);

      const tasksMap = getDemoTasksMap();
      setTasks(tasksMap[nextSelectedListId] ?? []);
      setSyncStatus("synced");
      setLoading(false);
      return;
    }

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
      handleApiError(err, "TASKS_LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isDemo, getDemoLists, getDemoTasksMap, handleApiError]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- bootstrap on mount or auth change
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
      setLoading(true);
      setSyncStatus("syncing");

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        setTasks(tasksMap[listId] ?? []);
        setSyncStatus("synced");
        setLoading(false);
        return;
      }

      try {
        const nextTasks = await fetchTasksForList(accessToken, listId);
        setTasks(nextTasks);
        setSyncStatus("synced");
      } catch (err) {
        handleApiError(err, "TASKS_LOAD_FAILED");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, isDemo, getDemoTasksMap, handleApiError],
  );

  const addTask = useCallback(
    async (title: string, extra?: Partial<Task>) => {
      if (!accessToken || !selectedListId || !title.trim()) return;

      const formattedDue = toRFC3339Date(extra?.due);
      const optimisticTask: Task = {
        id: isDemo ? `demo-${Date.now()}` : `temp-${Date.now()}`,
        title: title.trim(),
        status: "needsAction",
        notes: extra?.notes?.trim() ?? "",
        due: formattedDue ?? undefined,
      };

      setTasks((current) => [optimisticTask, ...current]);
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const currentListTasks = tasksMap[selectedListId] ?? [];
        tasksMap[selectedListId] = [optimisticTask, ...currentListTasks];
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

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
        handleApiError(err, "TASK_CREATE_FAILED");
      }
    },
    [accessToken, isDemo, selectedListId, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  const updateTaskById = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!accessToken || !selectedListId) return;

      const currentTask = tasks.find((task) => task.id === taskId);
      if (!currentTask) return;

      const sanitizedUpdates = { ...updates };
      if ("due" in updates) {
        sanitizedUpdates.due = toRFC3339Date(updates.due) ?? undefined;
      }

      const optimistic = { ...currentTask, ...sanitizedUpdates };
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? optimistic : task)),
      );
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const listTasks = tasksMap[selectedListId] ?? [];
        tasksMap[selectedListId] = listTasks.map((t) =>
          t.id === taskId ? optimistic : t,
        );
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        const nextTask = await updateTask(
          accessToken,
          selectedListId,
          taskId,
          sanitizedUpdates,
        );
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? nextTask : task)),
        );
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? currentTask : task)),
        );
        handleApiError(err, "TASK_UPDATE_FAILED");
      }
    },
    [
      accessToken,
      isDemo,
      selectedListId,
      tasks,
      getDemoTasksMap,
      saveDemoTasksMap,
      handleApiError,
    ],
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      if (!accessToken || !selectedListId) return;
      const currentTask = tasks.find((task) => task.id === taskId);
      if (!currentTask) return;

      setTasks((current) => current.filter((task) => task.id !== taskId));
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const listTasks = tasksMap[selectedListId] ?? [];
        tasksMap[selectedListId] = listTasks.filter((t) => t.id !== taskId);
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        await deleteTask(accessToken, selectedListId, taskId);
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) => [currentTask, ...current]);
        handleApiError(err, "TASK_DELETE_FAILED");
      }
    },
    [
      accessToken,
      isDemo,
      selectedListId,
      tasks,
      getDemoTasksMap,
      saveDemoTasksMap,
      handleApiError,
    ],
  );

  const moveTask = useCallback(
    async (taskId: string, targetListId: string) => {
      if (
        !accessToken ||
        !selectedListId ||
        !targetListId ||
        selectedListId === targetListId
      ) {
        return;
      }

      const taskToMove = tasks.find((t) => t.id === taskId);
      if (!taskToMove) return;

      // Optimistic removal from current list
      setTasks((current) => current.filter((t) => t.id !== taskId));
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const srcTasks = tasksMap[selectedListId] ?? [];
        const dstTasks = tasksMap[targetListId] ?? [];
        tasksMap[selectedListId] = srcTasks.filter((t) => t.id !== taskId);
        tasksMap[targetListId] = [taskToMove, ...dstTasks];
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        await moveTaskBetweenLists(
          accessToken,
          selectedListId,
          targetListId,
          taskToMove,
        );
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) => [taskToMove, ...current]);
        handleApiError(err, "TASK_MOVE_FAILED");
      }
    },
    [
      accessToken,
      isDemo,
      selectedListId,
      tasks,
      getDemoTasksMap,
      saveDemoTasksMap,
      handleApiError,
    ],
  );

  const addList = useCallback(
    async (title: string) => {
      if (!accessToken || !title.trim()) return;

      if (isDemo) {
        const newList: TaskList = {
          id: `demo-list-${Date.now()}`,
          title: title.trim(),
        };
        const updated = [newList, ...taskLists];
        setTaskLists(updated);
        saveDemoLists(updated);
        setSelectedListId(newList.id);
        setTasks([]);
        setSyncStatus("synced");
        return;
      }

      try {
        const created = await createTaskList(accessToken, title.trim());
        setTaskLists((current) => [created, ...current]);
        setSelectedListId(created.id);
        setTasks([]);
        setSyncStatus("synced");
      } catch (err) {
        handleApiError(err, "LIST_CREATE_FAILED");
      }
    },
    [accessToken, isDemo, taskLists, saveDemoLists, handleApiError],
  );

  const renameList = useCallback(
    async (listId: string, title: string) => {
      if (!accessToken || !listId || !title.trim()) return;

      if (isDemo) {
        const updated = taskLists.map((l) =>
          l.id === listId ? { ...l, title: title.trim() } : l,
        );
        setTaskLists(updated);
        saveDemoLists(updated);
        setSyncStatus("synced");
        return;
      }

      try {
        const updated = await updateTaskList(accessToken, listId, title.trim());
        setTaskLists((current) =>
          current.map((list) =>
            list.id === listId ? { ...list, title: updated.title } : list,
          ),
        );
        setSyncStatus("synced");
      } catch (err) {
        handleApiError(err, "LIST_RENAME_FAILED");
      }
    },
    [accessToken, isDemo, taskLists, saveDemoLists, handleApiError],
  );

  const removeList = useCallback(
    async (listId: string) => {
      if (!accessToken || !listId) return;

      if (isDemo) {
        const updatedLists = taskLists.filter((l) => l.id !== listId);
        setTaskLists(updatedLists);
        saveDemoLists(updatedLists);

        const tasksMap = getDemoTasksMap();
        delete tasksMap[listId];
        saveDemoTasksMap(tasksMap);

        if (selectedListId === listId) {
          const fallback = updatedLists[0];
          if (fallback) {
            setSelectedListId(fallback.id);
            setTasks(tasksMap[fallback.id] ?? []);
          } else {
            setSelectedListId("");
            setTasks([]);
          }
        }
        setSyncStatus("synced");
        return;
      }

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
        handleApiError(err, "LIST_DELETE_FAILED");
      }
    },
    [
      accessToken,
      isDemo,
      taskLists,
      saveDemoLists,
      getDemoTasksMap,
      saveDemoTasksMap,
      selectedListId,
      setList,
      handleApiError,
    ],
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

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((task) => {
      if (!task.due || task.status === "completed") return false;
      const dueDate = new Date(task.due);
      return dueDate.getTime() < today.getTime();
    });
  }, [tasks]);

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
    moveTask,
    addList,
    renameList,
    removeList,
    getFilteredTasks,
    fetchAll,
  };
}