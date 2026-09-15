import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearCompletedTasks,
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
import type { FilterMode, SortMode, SyncStatus, Task, TaskList } from "../types/tasks";

interface UseTasksOptions {
  accessToken: string | null;
  isDemo?: boolean;
  onAuthExpired?: () => void;
}

const DEMO_LISTS_STORAGE_KEY = "tasko-demo-lists";
const DEMO_TASKS_STORAGE_KEY = "tasko-demo-tasks";
const STARRED_TASKS_STORAGE_KEY = "tasko-starred-task-ids";

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
        listId: "demo-focus",
        title: "Overhaul Google Tasks Neo-Brutalist UI",
        notes: "Tactile high-contrast design with authentic Google Tasks flow, rapid entry, subtasks, and inspector drawer.",
        status: "needsAction",
        due: todayStr,
      },
      {
        id: "demo-t1-sub1",
        listId: "demo-focus",
        parent: "demo-t1",
        title: "Slide-over task inspector drawer",
        status: "completed",
      },
      {
        id: "demo-t1-sub2",
        listId: "demo-focus",
        parent: "demo-t1",
        title: "Support inline '+ Add a task' with rapid Enter entry",
        status: "needsAction",
      },
      {
        id: "demo-t2",
        listId: "demo-focus",
        title: "Audit Authorized JavaScript Origins in GCP",
        notes: "Verify http://localhost:5173 and production Vercel domains are registered in OAuth Client settings.",
        status: "needsAction",
        due: overdueStr,
      },
      {
        id: "demo-t3",
        listId: "demo-focus",
        title: "Ship RFC 3339 Date Serializer & Deserializer",
        notes: "Prevents empty due date string 400 Bad Request error on Google Tasks API.",
        status: "completed",
        due: todayStr,
      },
      {
        id: "demo-t4",
        listId: "demo-focus",
        title: "Deploy Vercel Production Build",
        notes: "Run full TypeScript validation and preview performance.",
        status: "needsAction",
        due: tomorrowStr,
      },
    ],
    "demo-system": [
      {
        id: "demo-t5",
        listId: "demo-system",
        title: "Configure OAuth consent screen test users",
        notes: "Add personal Gmail accounts while app status is in 'Testing' phase.",
        status: "needsAction",
        due: tomorrowStr,
      },
      {
        id: "demo-t6",
        listId: "demo-system",
        title: "Dark mode contrast ratio calibration",
        notes: "Refine charcoal borders to eliminate high-contrast glare.",
        status: "completed",
      },
    ],
    "demo-life": [
      {
        id: "demo-t7",
        listId: "demo-life",
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
  const [sortMode, setSortMode] = useState<SortMode>("my-order");
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STARRED_TASKS_STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set(["demo-t1", "demo-t2"]);
  });
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [error, setError] = useState<string | null>(null);

  const selectedListIdRef = useRef(selectedListId);
  useEffect(() => {
    selectedListIdRef.current = selectedListId;
  }, [selectedListId]);

  // Reset list selection if switching between demo and cloud modes
  const isDemoRef = useRef(isDemo);
  useEffect(() => {
    if (isDemoRef.current !== isDemo) {
      isDemoRef.current = isDemo;
      setSelectedListId("");
      selectedListIdRef.current = "";
    }
  }, [isDemo]);

  const onAuthExpiredRef = useRef(onAuthExpired);
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired;
  }, [onAuthExpired]);

  const inFlightRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

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
      if (
        message.includes("UNAUTHENTICATED") ||
        message.includes("401") ||
        message.includes("403") ||
        message.includes("CREDENTIALS_MISSING") ||
        message.includes("PERMISSION_DENIED") ||
        message.includes("INSUFFICIENT_SCOPE")
      ) {
        onAuthExpiredRef.current?.();
      }
      setError(message);
      setSyncStatus("error");
    },
    [],
  );

  const fetchAll = useCallback(async () => {
    if (!accessToken) {
      setTaskLists([]);
      setTasks([]);
      setSelectedListId("");
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (inFlightRef.current || now - lastFetchTimeRef.current < 1500) return;
    lastFetchTimeRef.current = now;
    inFlightRef.current = true;

    setLoading(true);
    setError(null);
    setSyncStatus("syncing");

    if (isDemo) {
      const lists = getDemoLists();
      setTaskLists(lists);
      const listExists = lists.some((l) => l.id === selectedListIdRef.current);
      const nextSelectedListId = listExists
        ? selectedListIdRef.current
        : lists[0]?.id || "";
      setSelectedListId(nextSelectedListId);

      const tasksMap = getDemoTasksMap();
      setTasks(tasksMap[nextSelectedListId] ?? []);
      setSyncStatus("synced");
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    try {
      const lists = await fetchTaskLists(accessToken);
      setTaskLists(lists);

      // Validate list exists in Google Task lists ONLY (never leak demo list IDs)
      const listExists = lists.some(
        (l) => l.id === selectedListIdRef.current && !l.id.startsWith("demo-"),
      );
      const nextSelectedListId = listExists
        ? selectedListIdRef.current
        : lists[0]?.id || "";
      setSelectedListId(nextSelectedListId);

      if (nextSelectedListId) {
        try {
          const nextTasks = await fetchTasksForList(
            accessToken,
            nextSelectedListId,
          );
          setTasks(nextTasks);
        } catch (listTasksErr) {
          console.warn("Could not fetch tasks for list", nextSelectedListId, listTasksErr);
          setTasks([]);
          // Fallback to first list if active list had an issue
          if (nextSelectedListId !== lists[0]?.id && lists[0]?.id) {
            try {
              const fallbackTasks = await fetchTasksForList(
                accessToken,
                lists[0].id,
              );
              setSelectedListId(lists[0].id);
              setTasks(fallbackTasks);
            } catch {
              // Ignore fallback error
            }
          }
        }
      } else {
        setTasks([]);
      }

      setSyncStatus("synced");
    } catch (err) {
      handleApiError(err, "TASKS_LOAD_FAILED");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [accessToken, isDemo, getDemoLists, getDemoTasksMap, handleApiError]);

  const fetchAllRef = useRef(fetchAll);
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- bootstrap on mount or auth change
    void fetchAllRef.current();
  }, [accessToken, isDemo]);

  const selectedList = useMemo(() => {
    if (selectedListId === "starred") {
      return { id: "starred", title: "STARRED" };
    }
    return taskLists.find((list) => list.id === selectedListId) ?? null;
  }, [selectedListId, taskLists]);

  const tasksLengthRef = useRef(0);
  useEffect(() => {
    tasksLengthRef.current = tasks.length;
  }, [tasks.length]);

  const setList = useCallback(
    async (listId: string) => {
      if (!accessToken || !listId) return;
      if (!isDemo && listId.startsWith("demo-") && listId !== "starred") return;
      if (selectedListIdRef.current === listId && tasksLengthRef.current > 0) return;
      setSelectedListId(listId);
      setLoading(true);
      setSyncStatus("syncing");

      if (listId === "starred") {
        if (isDemo) {
          const tasksMap = getDemoTasksMap();
          const allTasks = Object.values(tasksMap).flat();
          const starredTasks = allTasks.filter((t) => starredIds.has(t.id));
          setTasks(starredTasks);
        }
        setSyncStatus("synced");
        setLoading(false);
        return;
      }

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
    [accessToken, isDemo, getDemoTasksMap, handleApiError, starredIds],
  );

  const addTask = useCallback(
    async (title: string, extra?: Partial<Task>) => {
      if (!accessToken || !selectedListId || !title.trim()) return;
      const targetListId =
        selectedListId === "starred" ? taskLists[0]?.id || "" : selectedListId;
      if (!targetListId) return;
      if (!isDemo && targetListId.startsWith("demo-")) return;

      const formattedDue = toRFC3339Date(extra?.due);
      const isStarred = selectedListId === "starred" || Boolean(extra?.starred);
      const optimisticTask: Task = {
        id: isDemo ? `demo-${Date.now()}` : `temp-${Date.now()}`,
        listId: targetListId,
        title: title.trim(),
        status: "needsAction",
        notes: extra?.notes?.trim() ?? "",
        due: formattedDue ?? undefined,
        starred: isStarred,
      };

      setTasks((current) => [optimisticTask, ...current]);
      if (isStarred) {
        setStarredIds((prev) => {
          const next = new Set(prev);
          next.add(optimisticTask.id);
          try {
            localStorage.setItem(STARRED_TASKS_STORAGE_KEY, JSON.stringify(Array.from(next)));
          } catch {
            // ignore
          }
          return next;
        });
      }

      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const currentListTasks = tasksMap[targetListId] ?? [];
        tasksMap[targetListId] = [optimisticTask, ...currentListTasks];
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        const created = await createTask(accessToken, targetListId, {
          title: optimisticTask.title,
          notes: optimisticTask.notes,
          due: optimisticTask.due,
          status: optimisticTask.status,
        });
        setTasks((current) =>
          current.map((task) =>
            task.id === optimisticTask.id ? { ...created, starred: isStarred } : task,
          ),
        );
        if (isStarred) {
          setStarredIds((prev) => {
            const next = new Set(prev);
            next.delete(optimisticTask.id);
            next.add(created.id);
            try {
              localStorage.setItem(STARRED_TASKS_STORAGE_KEY, JSON.stringify(Array.from(next)));
            } catch {
              // ignore
            }
            return next;
          });
        }
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) =>
          current.filter((task) => task.id !== optimisticTask.id),
        );
        handleApiError(err, "TASK_CREATE_FAILED");
      }
    },
    [accessToken, isDemo, selectedListId, taskLists, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  const updateTaskById = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!accessToken) return;

      const currentTask = tasks.find((task) => task.id === taskId);
      if (!currentTask) return;

      const targetListId = currentTask.listId || selectedListId;
      if (!targetListId) return;
      if (!isDemo && targetListId.startsWith("demo-")) return;

      const sanitizedUpdates = { ...updates };
      if ("due" in updates) {
        sanitizedUpdates.due = toRFC3339Date(updates.due) ?? undefined;
      }

      const optimistic = { ...currentTask, ...sanitizedUpdates, listId: targetListId };
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? optimistic : task)),
      );
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const listTasks = tasksMap[targetListId] ?? [];
        tasksMap[targetListId] = listTasks.map((t) =>
          t.id === taskId ? optimistic : t,
        );
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        const nextTask = await updateTask(
          accessToken,
          targetListId,
          taskId,
          sanitizedUpdates,
        );
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? nextTask : task)),
        );
        setSyncStatus("synced");
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("404") || err.message.includes("notFound"))
        ) {
          // Task already gone on Google, remove locally and sync cleanly
          setTasks((current) => current.filter((task) => task.id !== taskId));
          setSyncStatus("synced");
          return;
        }
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
      if (!accessToken) return;

      const currentTask = tasks.find((task) => task.id === taskId);
      if (!currentTask) return;

      const targetListId = currentTask.listId || selectedListId;
      if (!targetListId) return;
      if (!isDemo && targetListId.startsWith("demo-")) return;

      setTasks((current) => current.filter((task) => task.id !== taskId));
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const listTasks = tasksMap[targetListId] ?? [];
        tasksMap[targetListId] = listTasks.filter((t) => t.id !== taskId);
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        await deleteTask(accessToken, targetListId, taskId);
        setSyncStatus("synced");
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("404") || err.message.includes("notFound"))
        ) {
          // Task already deleted remotely, proceed as success
          setSyncStatus("synced");
          return;
        }
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
      const taskToMove = tasks.find((t) => t.id === taskId);
      if (!taskToMove) return;

      const sourceListId = taskToMove.listId || selectedListId;
      if (
        !accessToken ||
        !sourceListId ||
        !targetListId ||
        sourceListId === targetListId
      ) {
        return;
      }
      if (
        !isDemo &&
        (sourceListId.startsWith("demo-") || targetListId.startsWith("demo-"))
      ) {
        return;
      }

      // Optimistic removal from current list
      setTasks((current) => current.filter((t) => t.id !== taskId));
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const srcTasks = tasksMap[sourceListId] ?? [];
        const dstTasks = tasksMap[targetListId] ?? [];
        const movedTask: Task = { ...taskToMove, listId: targetListId };
        tasksMap[sourceListId] = srcTasks.filter((t) => t.id !== taskId);
        tasksMap[targetListId] = [movedTask, ...dstTasks];
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        await moveTaskBetweenLists(
          accessToken,
          sourceListId,
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

  const toggleStarTask = useCallback((taskId: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      try {
        localStorage.setItem(
          STARRED_TASKS_STORAGE_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const addSubtask = useCallback(
    async (parentTaskId: string, title: string) => {
      if (!accessToken || !title.trim()) return;
      const parentTask = tasks.find((t) => t.id === parentTaskId);
      const targetListId =
        parentTask?.listId ||
        (selectedListId === "starred" ? taskLists[0]?.id || "" : selectedListId);
      if (!targetListId) return;

      const optimisticSubtask: Task = {
        id: isDemo ? `demo-sub-${Date.now()}` : `temp-sub-${Date.now()}`,
        listId: targetListId,
        parent: parentTaskId,
        title: title.trim(),
        status: "needsAction",
      };

      setTasks((current) => [...current, optimisticSubtask]);
      setSyncStatus("syncing");

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        const currentListTasks = tasksMap[targetListId] ?? [];
        tasksMap[targetListId] = [...currentListTasks, optimisticSubtask];
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      try {
        const created = await createTask(
          accessToken,
          targetListId,
          { title: title.trim(), status: "needsAction" },
          parentTaskId,
        );
        setTasks((current) =>
          current.map((t) => (t.id === optimisticSubtask.id ? created : t)),
        );
        setSyncStatus("synced");
      } catch (err) {
        setTasks((current) =>
          current.filter((t) => t.id !== optimisticSubtask.id),
        );
        handleApiError(err, "SUBTASK_CREATE_FAILED");
      }
    },
    [
      accessToken,
      isDemo,
      selectedListId,
      taskLists,
      tasks,
      getDemoTasksMap,
      saveDemoTasksMap,
      handleApiError,
    ],
  );

  const clearCompleted = useCallback(
    async (listId?: string) => {
      const targetListId =
        listId || (selectedListId === "starred" ? "" : selectedListId);

      setTasks((current) => current.filter((t) => t.status !== "completed"));
      setSyncStatus("syncing");

      if (isDemo) {
        const tasksMap = getDemoTasksMap();
        if (targetListId && tasksMap[targetListId]) {
          tasksMap[targetListId] = tasksMap[targetListId].filter(
            (t) => t.status !== "completed",
          );
        } else {
          for (const key of Object.keys(tasksMap)) {
            tasksMap[key] = tasksMap[key].filter(
              (t) => t.status !== "completed",
            );
          }
        }
        saveDemoTasksMap(tasksMap);
        setSyncStatus("synced");
        return;
      }

      if (accessToken && targetListId) {
        try {
          await clearCompletedTasks(accessToken, targetListId);
          setSyncStatus("synced");
        } catch (err) {
          handleApiError(err, "CLEAR_COMPLETED_FAILED");
        }
      } else {
        setSyncStatus("synced");
      }
    },
    [
      accessToken,
      isDemo,
      selectedListId,
      getDemoTasksMap,
      saveDemoTasksMap,
      handleApiError,
    ],
  );

  const tasksWithMeta = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      starred: starredIds.has(task.id),
    }));
  }, [tasks, starredIds]);

  const subtasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasksWithMeta) {
      if (task.parent) {
        if (!map[task.parent]) map[task.parent] = [];
        map[task.parent].push(task);
      }
    }
    return map;
  }, [tasksWithMeta]);

  const topLevelTasks = useMemo(() => {
    if (selectedListId === "starred") {
      return tasksWithMeta.filter((t) => t.starred);
    }
    return tasksWithMeta.filter((t) => !t.parent);
  }, [selectedListId, tasksWithMeta]);

  const activeTasks = useMemo(
    () => topLevelTasks.filter((task) => task.status === "needsAction"),
    [topLevelTasks],
  );

  const completedTasks = useMemo(
    () => topLevelTasks.filter((task) => task.status === "completed"),
    [topLevelTasks],
  );

  const sortedActiveTasks = useMemo(() => {
    const list = [...activeTasks];
    switch (sortMode) {
      case "date":
        return list.sort((a, b) => {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due.localeCompare(b.due);
        });
      case "title":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case "starred":
        return list.sort((a, b) => {
          if (a.starred && !b.starred) return -1;
          if (!a.starred && b.starred) return 1;
          return 0;
        });
      case "my-order":
      default:
        return list;
    }
  }, [activeTasks, sortMode]);

  const dueTodayTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return topLevelTasks.filter((task) => {
      if (!task.due || task.status === "completed") return false;
      const dueDate = new Date(task.due);
      return dueDate.toDateString() === today.toDateString();
    });
  }, [topLevelTasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return topLevelTasks.filter((task) => {
      if (!task.due || task.status === "completed") return false;
      const dueDate = new Date(task.due);
      return dueDate.getTime() < today.getTime();
    });
  }, [topLevelTasks]);

  const starredCount = useMemo(() => {
    return tasksWithMeta.filter((t) => t.starred && t.status === "needsAction")
      .length;
  }, [tasksWithMeta]);

  const listStats = useMemo(
    () => ({
      all: topLevelTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      today: dueTodayTasks.length,
      overdue: overdueTasks.length,
      starred: starredCount,
    }),
    [
      topLevelTasks.length,
      activeTasks.length,
      completedTasks.length,
      dueTodayTasks.length,
      overdueTasks.length,
      starredCount,
    ],
  );

  const getFilteredTasks = useCallback(
    (filter: FilterMode) => {
      switch (filter) {
        case "active":
          return sortedActiveTasks;
        case "completed":
          return completedTasks;
        case "today":
          return dueTodayTasks;
        case "overdue":
          return overdueTasks;
        default:
          return topLevelTasks;
      }
    },
    [
      sortedActiveTasks,
      completedTasks,
      dueTodayTasks,
      overdueTasks,
      topLevelTasks,
    ],
  );

  return {
    taskLists,
    selectedListId,
    selectedList,
    tasks: topLevelTasks,
    activeTasks: sortedActiveTasks,
    completedTasks,
    subtasksMap,
    sortMode,
    setSortMode,
    loading,
    error,
    syncStatus,
    listStats,
    setList,
    addTask,
    addSubtask,
    updateTaskById,
    removeTask,
    moveTask,
    addList,
    renameList,
    removeList,
    clearCompleted,
    toggleStarTask,
    getFilteredTasks,
    fetchAll,
  };
}