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
  { id: "demo-focus", title: "Focus // Sprint" },
  { id: "demo-system", title: "System Architecture" },
  { id: "demo-life", title: "Personal Tasks" },
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
        title: "Rebuild UI to match Google Tasks Board",
        notes: "Multi-column side-by-side lists, rapid task entry, subtasks, and inspector sidepanel.",
        status: "needsAction",
        due: todayStr,
      },
      {
        id: "demo-t1-sub1",
        listId: "demo-focus",
        parent: "demo-t1",
        title: "Side-by-side list columns layout",
        status: "completed",
      },
      {
        id: "demo-t1-sub2",
        listId: "demo-focus",
        parent: "demo-t1",
        title: "Slide-over task inspector drawer",
        status: "needsAction",
      },
      {
        id: "demo-t2",
        listId: "demo-focus",
        title: "Audit GCP Authorized JavaScript Origins",
        notes: "Ensure localhost and production domains are configured.",
        status: "needsAction",
        due: overdueStr,
      },
      {
        id: "demo-t3",
        listId: "demo-focus",
        title: "RFC 3339 Date Serializer verification",
        notes: "Prevents empty due date string errors on Google Tasks API.",
        status: "completed",
        due: todayStr,
      },
    ],
    "demo-system": [
      {
        id: "demo-t5",
        listId: "demo-system",
        title: "Configure OAuth Consent screen test users",
        notes: "Add personal Gmail accounts while app status is in 'Testing' phase.",
        status: "needsAction",
        due: tomorrowStr,
      },
      {
        id: "demo-t6",
        listId: "demo-system",
        title: "Dark mode high-contrast calibration",
        notes: "Refined dark palette for optimal readability.",
        status: "completed",
      },
    ],
    "demo-life": [
      {
        id: "demo-t7",
        listId: "demo-life",
        title: "Order mechanical keyboard switches",
        notes: "Linear tactile switches for coding.",
        status: "needsAction",
      },
      {
        id: "demo-t8",
        listId: "demo-life",
        title: "Review weekly sprint priorities",
        notes: "Plan objectives for the upcoming sprint.",
        status: "needsAction",
        due: tomorrowStr,
      },
    ],
  };
}

export function useTasks({ accessToken, isDemo, onAuthExpired }: UseTasksOptions) {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [tasksByList, setTasksByList] = useState<Record<string, Task[]>>({});
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

  const onAuthExpiredRef = useRef(onAuthExpired);
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired;
  }, [onAuthExpired]);

  const inFlightRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // Storage helpers for demo
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

  // Fetch all lists and tasks across all lists
  const fetchAll = useCallback(async () => {
    if (!accessToken) {
      setTaskLists([]);
      setTasksByList({});
      setSelectedListId("all");
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
      const tasksMap = getDemoTasksMap();
      setTasksByList(tasksMap);
      setSyncStatus("synced");
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    try {
      const lists = await fetchTaskLists(accessToken);
      setTaskLists(lists);

      // Fetch tasks for all lists in parallel
      const settled = await Promise.allSettled(
        lists.map((l) => fetchTasksForList(accessToken, l.id)),
      );

      const map: Record<string, Task[]> = {};
      lists.forEach((l, idx) => {
        const res = settled[idx];
        map[l.id] = res && res.status === "fulfilled" ? res.value : [];
      });

      setTasksByList(map);
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
    // oxlint-disable-next-line react/set-state-in-effect
    void fetchAllRef.current();
  }, [accessToken, isDemo]);

  const selectedList = useMemo(() => {
    if (selectedListId === "starred") {
      return { id: "starred", title: "Starred Tasks" };
    }
    if (selectedListId === "all") {
      return { id: "all", title: "All Boards" };
    }
    return taskLists.find((list) => list.id === selectedListId) ?? null;
  }, [selectedListId, taskLists]);

  const setList = useCallback((listId: string) => {
    setSelectedListId(listId);
  }, []);

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

  // Add Task to a specific list
  const addTask = useCallback(
    async (title: string, extra?: Partial<Task>, targetList?: string) => {
      if (!accessToken || !title.trim()) return;

      const listIdToUse =
        targetList ||
        (selectedListId !== "starred" && selectedListId !== "all"
          ? selectedListId
          : taskLists[0]?.id || "");

      if (!listIdToUse) return;

      const formattedDue = toRFC3339Date(extra?.due);
      const isStarred = selectedListId === "starred" || Boolean(extra?.starred);
      const optimisticTask: Task = {
        id: isDemo ? `demo-${Date.now()}` : `temp-${Date.now()}`,
        listId: listIdToUse,
        title: title.trim(),
        status: "needsAction",
        notes: extra?.notes?.trim() ?? "",
        due: formattedDue ?? undefined,
        starred: isStarred,
      };

      setTasksByList((current) => ({
        ...current,
        [listIdToUse]: [optimisticTask, ...(current[listIdToUse] ?? [])],
      }));

      if (isStarred) {
        setStarredIds((prev) => {
          const next = new Set(prev).add(optimisticTask.id);
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
      }

      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const map = getDemoTasksMap();
        map[listIdToUse] = [optimisticTask, ...(map[listIdToUse] ?? [])];
        saveDemoTasksMap(map);
        setSyncStatus("synced");
        return;
      }

      try {
        const created = await createTask(accessToken, listIdToUse, {
          title: optimisticTask.title,
          notes: optimisticTask.notes,
          due: optimisticTask.due,
          status: optimisticTask.status,
        });

        setTasksByList((current) => ({
          ...current,
          [listIdToUse]: (current[listIdToUse] ?? []).map((t) =>
            t.id === optimisticTask.id ? { ...created, starred: isStarred } : t,
          ),
        }));

        if (isStarred) {
          setStarredIds((prev) => {
            const next = new Set(prev);
            next.delete(optimisticTask.id);
            next.add(created.id);
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
        }
        setSyncStatus("synced");
      } catch (err) {
        setTasksByList((current) => ({
          ...current,
          [listIdToUse]: (current[listIdToUse] ?? []).filter(
            (t) => t.id !== optimisticTask.id,
          ),
        }));
        handleApiError(err, "TASK_CREATE_FAILED");
      }
    },
    [accessToken, isDemo, selectedListId, taskLists, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  // Add subtask
  const addSubtask = useCallback(
    async (parentTaskId: string, title: string) => {
      if (!accessToken || !title.trim()) return;

      // Find parent task to get listId
      let targetListId = "";
      for (const [listId, listTasks] of Object.entries(tasksByList)) {
        if (listTasks.some((t) => t.id === parentTaskId)) {
          targetListId = listId;
          break;
        }
      }
      if (!targetListId) targetListId = taskLists[0]?.id || "";
      if (!targetListId) return;

      const optimisticSubtask: Task = {
        id: isDemo ? `demo-sub-${Date.now()}` : `temp-sub-${Date.now()}`,
        listId: targetListId,
        parent: parentTaskId,
        title: title.trim(),
        status: "needsAction",
      };

      setTasksByList((current) => ({
        ...current,
        [targetListId]: [...(current[targetListId] ?? []), optimisticSubtask],
      }));
      setSyncStatus("syncing");

      if (isDemo) {
        const map = getDemoTasksMap();
        map[targetListId] = [...(map[targetListId] ?? []), optimisticSubtask];
        saveDemoTasksMap(map);
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
        setTasksByList((current) => ({
          ...current,
          [targetListId]: (current[targetListId] ?? []).map((t) =>
            t.id === optimisticSubtask.id ? created : t,
          ),
        }));
        setSyncStatus("synced");
      } catch (err) {
        setTasksByList((current) => ({
          ...current,
          [targetListId]: (current[targetListId] ?? []).filter(
            (t) => t.id !== optimisticSubtask.id,
          ),
        }));
        handleApiError(err, "SUBTASK_CREATE_FAILED");
      }
    },
    [accessToken, isDemo, taskLists, tasksByList, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  // Update task
  const updateTaskById = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      if (!accessToken) return;

      let targetListId = "";
      let currentTask: Task | null = null;
      for (const [listId, listTasks] of Object.entries(tasksByList)) {
        const found = listTasks.find((t) => t.id === taskId);
        if (found) {
          targetListId = listId;
          currentTask = found;
          break;
        }
      }
      if (!targetListId || !currentTask) return;

      const sanitizedUpdates = { ...updates };
      if ("due" in updates) {
        sanitizedUpdates.due = toRFC3339Date(updates.due) ?? undefined;
      }

      const optimistic: Task = {
        ...currentTask,
        ...sanitizedUpdates,
        listId: targetListId,
      };

      setTasksByList((current) => ({
        ...current,
        [targetListId]: (current[targetListId] ?? []).map((t) =>
          t.id === taskId ? optimistic : t,
        ),
      }));
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const map = getDemoTasksMap();
        map[targetListId] = (map[targetListId] ?? []).map((t) =>
          t.id === taskId ? optimistic : t,
        );
        saveDemoTasksMap(map);
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
        setTasksByList((current) => ({
          ...current,
          [targetListId]: (current[targetListId] ?? []).map((t) =>
            t.id === taskId ? nextTask : t,
          ),
        }));
        setSyncStatus("synced");
      } catch (err) {
        setTasksByList((current) => ({
          ...current,
          [targetListId]: (current[targetListId] ?? []).map((t) =>
            t.id === taskId ? currentTask : t,
          ),
        }));
        handleApiError(err, "TASK_UPDATE_FAILED");
      }
    },
    [accessToken, isDemo, tasksByList, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  // Remove task
  const removeTask = useCallback(
    async (taskId: string) => {
      if (!accessToken) return;

      let targetListId = "";
      for (const [listId, listTasks] of Object.entries(tasksByList)) {
        if (listTasks.some((t) => t.id === taskId)) {
          targetListId = listId;
          break;
        }
      }
      if (!targetListId) return;

      // Remove task and any child subtasks
      setTasksByList((current) => ({
        ...current,
        [targetListId]: (current[targetListId] ?? []).filter(
          (t) => t.id !== taskId && t.parent !== taskId,
        ),
      }));
      setSyncStatus("syncing");
      setError(null);

      if (isDemo) {
        const map = getDemoTasksMap();
        map[targetListId] = (map[targetListId] ?? []).filter(
          (t) => t.id !== taskId && t.parent !== taskId,
        );
        saveDemoTasksMap(map);
        setSyncStatus("synced");
        return;
      }

      try {
        await deleteTask(accessToken, targetListId, taskId);
        setSyncStatus("synced");
      } catch (err) {
        handleApiError(err, "TASK_DELETE_FAILED");
      }
    },
    [accessToken, isDemo, tasksByList, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  // Move task between lists
  const moveTask = useCallback(
    async (taskId: string, targetListId: string) => {
      let sourceListId = "";
      let taskToMove: Task | null = null;
      for (const [listId, listTasks] of Object.entries(tasksByList)) {
        const found = listTasks.find((t) => t.id === taskId);
        if (found) {
          sourceListId = listId;
          taskToMove = found;
          break;
        }
      }
      if (
        !accessToken ||
        !sourceListId ||
        !targetListId ||
        sourceListId === targetListId ||
        !taskToMove
      ) {
        return;
      }

      const moved: Task = { ...taskToMove, listId: targetListId };

      setTasksByList((current) => ({
        ...current,
        [sourceListId]: (current[sourceListId] ?? []).filter(
          (t) => t.id !== taskId,
        ),
        [targetListId]: [moved, ...(current[targetListId] ?? [])],
      }));
      setSyncStatus("syncing");

      if (isDemo) {
        const map = getDemoTasksMap();
        map[sourceListId] = (map[sourceListId] ?? []).filter(
          (t) => t.id !== taskId,
        );
        map[targetListId] = [moved, ...(map[targetListId] ?? [])];
        saveDemoTasksMap(map);
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
        handleApiError(err, "TASK_MOVE_FAILED");
      }
    },
    [accessToken, isDemo, tasksByList, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  // Create list
  const addList = useCallback(
    async (title: string) => {
      if (!accessToken || !title.trim()) return;

      if (isDemo) {
        const newList: TaskList = {
          id: `demo-list-${Date.now()}`,
          title: title.trim(),
        };
        const updated = [...taskLists, newList];
        setTaskLists(updated);
        saveDemoLists(updated);
        setTasksByList((current) => ({ ...current, [newList.id]: [] }));
        setSyncStatus("synced");
        return;
      }

      try {
        const created = await createTaskList(accessToken, title.trim());
        setTaskLists((current) => [...current, created]);
        setTasksByList((current) => ({ ...current, [created.id]: [] }));
        setSyncStatus("synced");
      } catch (err) {
        handleApiError(err, "LIST_CREATE_FAILED");
      }
    },
    [accessToken, isDemo, taskLists, saveDemoLists, handleApiError],
  );

  // Rename list
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

  // Remove list
  const removeList = useCallback(
    async (listId: string) => {
      if (!accessToken || !listId) return;

      if (isDemo) {
        const updatedLists = taskLists.filter((l) => l.id !== listId);
        setTaskLists(updatedLists);
        saveDemoLists(updatedLists);

        const map = getDemoTasksMap();
        delete map[listId];
        saveDemoTasksMap(map);

        setTasksByList((current) => {
          const next = { ...current };
          delete next[listId];
          return next;
        });

        if (selectedListId === listId) {
          setSelectedListId("all");
        }
        setSyncStatus("synced");
        return;
      }

      try {
        await deleteTaskList(accessToken, listId);
        setTaskLists((current) => current.filter((l) => l.id !== listId));
        setTasksByList((current) => {
          const next = { ...current };
          delete next[listId];
          return next;
        });
        if (selectedListId === listId) {
          setSelectedListId("all");
        }
        setSyncStatus("synced");
      } catch (err) {
        handleApiError(err, "LIST_DELETE_FAILED");
      }
    },
    [accessToken, isDemo, taskLists, saveDemoLists, getDemoTasksMap, saveDemoTasksMap, selectedListId, handleApiError],
  );

  // Clear completed tasks for a list
  const clearCompleted = useCallback(
    async (listId?: string) => {
      const targetListId =
        listId ||
        (selectedListId !== "starred" && selectedListId !== "all"
          ? selectedListId
          : "");

      if (targetListId) {
        setTasksByList((current) => ({
          ...current,
          [targetListId]: (current[targetListId] ?? []).filter(
            (t) => t.status !== "completed",
          ),
        }));

        if (isDemo) {
          const map = getDemoTasksMap();
          if (map[targetListId]) {
            map[targetListId] = map[targetListId].filter(
              (t) => t.status !== "completed",
            );
            saveDemoTasksMap(map);
          }
          setSyncStatus("synced");
          return;
        }

        if (accessToken) {
          try {
            await clearCompletedTasks(accessToken, targetListId);
            setSyncStatus("synced");
          } catch (err) {
            handleApiError(err, "CLEAR_COMPLETED_FAILED");
          }
        }
      } else {
        // Clear completed across all lists
        setTasksByList((current) => {
          const next: Record<string, Task[]> = {};
          for (const [k, v] of Object.entries(current)) {
            next[k] = v.filter((t) => t.status !== "completed");
          }
          return next;
        });

        if (isDemo) {
          const map = getDemoTasksMap();
          for (const k of Object.keys(map)) {
            map[k] = map[k].filter((t) => t.status !== "completed");
          }
          saveDemoTasksMap(map);
          setSyncStatus("synced");
          return;
        }
      }
    },
    [accessToken, isDemo, selectedListId, getDemoTasksMap, saveDemoTasksMap, handleApiError],
  );

  // Annotate all tasks with starred state
  const tasksByListWithMeta = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const [listId, listTasks] of Object.entries(tasksByList)) {
      map[listId] = listTasks.map((t) => ({
        ...t,
        starred: starredIds.has(t.id),
      }));
    }
    return map;
  }, [tasksByList, starredIds]);

  // Subtasks map across all lists
  const subtasksMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const listTasks of Object.values(tasksByListWithMeta)) {
      for (const t of listTasks) {
        if (t.parent) {
          if (!map[t.parent]) map[t.parent] = [];
          map[t.parent].push(t);
        }
      }
    }
    return map;
  }, [tasksByListWithMeta]);

  // All tasks flattened
  const allTasks = useMemo(() => {
    return Object.values(tasksByListWithMeta).flat();
  }, [tasksByListWithMeta]);

  // Starred tasks
  const starredTasks = useMemo(() => {
    return allTasks.filter((t) => t.starred);
  }, [allTasks]);

  // Active tasks for current view
  const currentViewTasks = useMemo(() => {
    if (selectedListId === "starred") {
      return starredTasks;
    }
    if (selectedListId === "all") {
      return allTasks;
    }
    return tasksByListWithMeta[selectedListId] ?? [];
  }, [selectedListId, starredTasks, allTasks, tasksByListWithMeta]);

  const topLevelTasks = useMemo(() => {
    return currentViewTasks.filter((t) => !t.parent);
  }, [currentViewTasks]);

  const activeTasks = useMemo(() => {
    return topLevelTasks.filter((t) => t.status === "needsAction");
  }, [topLevelTasks]);

  const completedTasks = useMemo(() => {
    return topLevelTasks.filter((t) => t.status === "completed");
  }, [topLevelTasks]);

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

  const starredCount = useMemo(() => {
    return allTasks.filter((t) => t.starred && t.status === "needsAction").length;
  }, [allTasks]);

  const listStats = useMemo(
    () => ({
      all: topLevelTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      today: topLevelTasks.filter(
        (t) =>
          t.status === "needsAction" &&
          t.due &&
          new Date(t.due).toDateString() === new Date().toDateString(),
      ).length,
      overdue: topLevelTasks.filter(
        (t) =>
          t.status === "needsAction" &&
          t.due &&
          new Date(t.due).getTime() < new Date().setHours(0, 0, 0, 0),
      ).length,
      starred: starredCount,
    }),
    [topLevelTasks, activeTasks.length, completedTasks.length, starredCount],
  );

  const getFilteredTasks = useCallback(
    (filter: FilterMode) => {
      switch (filter) {
        case "active":
          return sortedActiveTasks;
        case "completed":
          return completedTasks;
        default:
          return topLevelTasks;
      }
    },
    [sortedActiveTasks, completedTasks, topLevelTasks],
  );

  return {
    taskLists,
    selectedListId,
    selectedList,
    tasksByList: tasksByListWithMeta,
    allTasks,
    starredTasks,
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