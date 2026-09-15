import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleDashed,
  HelpCircle,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useTasks } from "./hooks/useTasks";
import { toInputDateFormat } from "./services/googleTasks";
import type { FilterMode, Task, TaskList } from "./types/tasks";

const filterLabels: Array<{ label: string; value: FilterMode }> = [
  { label: "ALL", value: "all" },
  { label: "ACTIVE", value: "active" },
  { label: "COMPLETED", value: "completed" },
  { label: "TODAY", value: "today" },
  { label: "OVERDUE", value: "overdue" },
];

const sidebarNav: Array<{
  label: string;
  value: FilterMode;
  icon: typeof CalendarDays;
}> = [
  { label: "ALL TASKS", value: "all", icon: CircleDashed },
  { label: "TODAY", value: "today", icon: CalendarDays },
  { label: "COMPLETED", value: "completed", icon: Check },
];

const shortcutRows: Array<{ keys: string; label: string }> = [
  { keys: "N", label: "new task" },
  { keys: "/", label: "search" },
  { keys: "J / K", label: "navigate tasks" },
  { keys: "C", label: "complete task" },
  { keys: "E", label: "focus title" },
  { keys: "ENTER", label: "save in editor" },
  { keys: "ESC", label: "close editor / modal" },
  { keys: "?", label: "show shortcuts" },
];

function dateFromDue(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

function formatDue(value?: string): string {
  if (!value) return "";
  const date = dateFromDue(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.due || task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dateFromDue(task.due);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function isDueToday(due?: string): boolean {
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = dateFromDue(due);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function isDueTomorrow(due?: string): boolean {
  if (!due) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const d = dateFromDue(due);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === tomorrow.getTime();
}

interface TaskEditorProps {
  task: Task;
  taskLists: TaskList[];
  selectedListId: string;
  onClose: () => void;
  onSave: (
    taskId: string,
    draft: { title: string; notes: string; due: string },
  ) => void;
  onDelete: (taskId: string) => void;
  onMoveToList: (taskId: string, targetListId: string) => void;
  onToggleStatus: (task: Task) => void;
}

function TaskEditor({
  task,
  taskLists,
  selectedListId,
  onClose,
  onSave,
  onDelete,
  onMoveToList,
  onToggleStatus,
}: TaskEditorProps) {
  const [draft, setDraft] = useState({
    title: task.title,
    notes: task.notes ?? "",
    due: toInputDateFormat(task.due),
  });

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- sync draft state when active task updates
    setDraft({
      title: task.title,
      notes: task.notes ?? "",
      due: toInputDateFormat(task.due),
    });
  }, [task]);

  const handleSave = () => {
    onSave(task.id, { ...draft, title: draft.title.trim() || task.title });
  };

  return (
    <div className="editor-shell">
      <div className="editor-header-row">
        <p className="eyebrow">EDIT TASK</p>
        <button
          type="button"
          className="icon-button"
          aria-label="Close editor"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <label className="field-block">
        <span>TITLE</span>
        <input
          id="task-editor-title"
          type="text"
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSave();
            }
          }}
        />
      </label>

      <label className="field-block">
        <span>DETAILS & NOTES</span>
        <textarea
          value={draft.notes}
          placeholder="Add descriptions, markdown links, checklist notes..."
          onChange={(event) =>
            setDraft((current) => ({ ...current, notes: event.target.value }))
          }
          rows={5}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              handleSave();
            }
          }}
        />
      </label>

      <div className="field-row">
        <div className="field-block half">
          <span>DUE DATE</span>
          <div className="due-input-group">
            <input
              type="date"
              value={draft.due}
              onChange={(event) =>
                setDraft((current) => ({ ...current, due: event.target.value }))
              }
            />
            {draft.due ? (
              <button
                type="button"
                className="mini-button"
                onClick={() => setDraft((current) => ({ ...current, due: "" }))}
                title="Clear due date"
              >
                CLEAR
              </button>
            ) : null}
          </div>
        </div>

        <label className="field-block half">
          <span>MOVE TO LIST</span>
          <select
            value={selectedListId}
            onChange={(event) => {
              const targetId = event.target.value;
              if (targetId && targetId !== selectedListId) {
                onMoveToList(task.id, targetId);
              }
            }}
          >
            {taskLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="editor-actions">
        <button type="button" className="primary-button" onClick={handleSave}>
          <Check size={16} /> SAVE CHANGES
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onToggleStatus(task)}
        >
          {task.status === "completed" ? (
            <>
              <Circle size={15} /> MARK ACTIVE
            </>
          ) : (
            <>
              <Check size={15} /> MARK COMPLETED
            </>
          )}
        </button>
        <button
          type="button"
          className="secondary-button danger"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 size={16} /> DELETE TASK
        </button>
      </div>
    </div>
  );
}

function App() {
  const {
    session,
    user,
    status,
    error,
    authExpired,
    signIn,
    signOut,
    startDemoMode,
    setAuthExpired,
  } = useGoogleAuth();

  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueChip, setNewTaskDueChip] = useState<
    "none" | "today" | "tomorrow" | "next-week" | "custom"
  >("none");
  const [newTaskCustomDue, setNewTaskCustomDue] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [showNotesField, setShowNotesField] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const accessToken = session?.accessToken ?? null;
  const {
    taskLists,
    selectedListId,
    selectedList,
    loading,
    error: taskError,
    syncStatus,
    listStats,
    setList,
    addTask,
    updateTaskById,
    removeTask,
    moveTask,
    addList,
    removeList,
    renameList,
    getFilteredTasks,
  } = useTasks({
    accessToken,
    isDemo: session?.isDemo,
    onAuthExpired: () => setAuthExpired(true),
  });

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = getFilteredTasks(filter);

    if (!term) return source;

    return source.filter((task) => {
      const haystack = `${task.title} ${task.notes ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, getFilteredTasks, search]);

  const selectedTask = useMemo(
    () =>
      visibleTasks.find((task) => task.id === selectedTaskId) ??
      visibleTasks[0] ??
      null,
    [selectedTaskId, visibleTasks],
  );

  const activeFilterLabel =
    filterLabels.find((item) => item.value === filter)?.label ?? "ALL";

  const computeNewTaskDue = (): string => {
    const now = new Date();
    if (newTaskDueChip === "today") {
      return now.toISOString().split("T")[0];
    }
    if (newTaskDueChip === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }
    if (newTaskDueChip === "next-week") {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split("T")[0];
    }
    if (newTaskDueChip === "custom") {
      return newTaskCustomDue;
    }
    return "";
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const due = computeNewTaskDue();
    void addTask(newTaskTitle, {
      notes: newTaskNotes,
      due: due || undefined,
    });
    setNewTaskTitle("");
    setNewTaskNotes("");
    setShowNotesField(false);
    setNewTaskDueChip("none");
    setNewTaskCustomDue("");
  };

  const handleSaveTask = (
    taskId: string,
    draft: { title: string; notes: string; due: string },
  ) => {
    void updateTaskById(taskId, {
      title: draft.title,
      notes: draft.notes,
      due: draft.due,
    });
  };

  const handleToggleComplete = (task: Task) => {
    void updateTaskById(task.id, {
      status: task.status === "completed" ? "needsAction" : "completed",
      completed:
        task.status === "completed" ? undefined : new Date().toISOString(),
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (event.key === "?") {
        event.preventDefault();
        setShowShortcuts((value) => !value);
        return;
      }

      if (isTyping) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "n") {
        event.preventDefault();
        setNewTaskTitle("");
        document.getElementById("quick-task-input")?.focus();
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
        return;
      }

      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        if (!visibleTasks.length) return;
        const index = visibleTasks.findIndex(
          (task) => task.id === selectedTaskId,
        );
        const next =
          visibleTasks[index < 0 ? 0 : (index + 1) % visibleTasks.length];
        setSelectedTaskId(next.id);
        return;
      }

      if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!visibleTasks.length) return;
        const index = visibleTasks.findIndex(
          (task) => task.id === selectedTaskId,
        );
        const next =
          visibleTasks[
            index < 0
              ? visibleTasks.length - 1
              : (index - 1 + visibleTasks.length) % visibleTasks.length
          ];
        setSelectedTaskId(next.id);
        return;
      }

      if (selectedTask) {
        if (key === "c") {
          event.preventDefault();
          void handleToggleComplete(selectedTask);
          return;
        }

        if (key === "e") {
          event.preventDefault();
          document.getElementById("task-editor-title")?.focus();
          return;
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setShowShortcuts(false);
        setShowSetupModal(false);
        setSelectedTaskId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    void addList(newListName);
    setNewListName("");
    setShowNewListInput(false);
  };

  const handleRenameList = (listId: string, title: string) => {
    const nextTitle = window.prompt("Rename list", title);
    if (!nextTitle || !nextTitle.trim()) return;
    void renameList(listId, nextTitle);
  };

  const handleDeleteList = (listId: string) => {
    if (
      !window.confirm(
        "Delete this list? This cannot be undone in Google Tasks.",
      )
    ) {
      return;
    }
    void removeList(listId);
  };

  const taskCountLabel = `${visibleTasks.length} TASK${visibleTasks.length === 1 ? "" : "S"}`;

  if (!session) {
    return (
      <div className="landing-shell">
        <header className="topbar landing-topbar">
          <div className="brand-wrap">
            <span className="brand-block">TASKS RAMASCRIPT</span>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowSetupModal(true)}
          >
            <HelpCircle size={16} /> GCP SETUP GUIDE
          </button>
        </header>

        <main className="landing-page">
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">YOUR TASKS. YOUR GOOGLE ACCOUNT.</p>
              <h1>
                TASKS.
                <br />
                WITHOUT THE
                <br />
                BORING UI.
              </h1>
              <p className="lede">
                A fast, brutalist interface for your Google Tasks.
                <br />
                Direct two-way sync with Google Cloud. Or test offline in Demo Sandbox.
              </p>

              <div className="cta-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void signIn()}
                  disabled={status === "signing-in"}
                >
                  {status === "signing-in" ? (
                    "CONNECTING TO GOOGLE..."
                  ) : (
                    <>
                      CONTINUE WITH GOOGLE <ChevronRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={startDemoMode}
                >
                  <Sparkles size={16} /> TRY DEMO SANDBOX
                </button>
              </div>

              {status === "error" && error ? (
                <div className="error-block">
                  <p><strong>AUTH NOTICE:</strong> {error}</p>
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="mini-button"
                      onClick={startDemoMode}
                    >
                      OPEN DEMO MODE
                    </button>
                    <button
                      type="button"
                      className="mini-button"
                      onClick={() => setShowSetupModal(true)}
                    >
                      VIEW SETUP INSTRUCTIONS
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="microcopy">
                NO SEPARATE DATABASE · GOOGLE DIRECT API · 100% PRIVATE
              </p>
            </div>

            <div className="hero-aside">
              <div className="mini-app-shell">
                <div className="mini-app-header">
                  <span>TASKS RAMASCRIPT</span>
                  <span className="sync-pill synced">● READY</span>
                </div>
                <div className="mini-app-body">
                  <aside className="mini-side">
                    <div className="mini-line active">TODAY</div>
                    <div className="mini-line">DEV SPRINT</div>
                    <div className="mini-line">PERSONAL</div>
                  </aside>
                  <section className="mini-main">
                    <div className="mini-main-header">SAMPLE BOARD</div>
                    <div className="task-row">
                      <span className="checkbox done" />
                      <span>Overhaul Brutalist UI</span>
                    </div>
                    <div className="task-row">
                      <span className="checkbox empty" />
                      <span>Verify RFC 3339 date serializer</span>
                    </div>
                    <div className="task-row">
                      <span className="checkbox empty" />
                      <span>Add authorized origins to GCP</span>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <button
                        type="button"
                        className="primary-button tiny"
                        onClick={startDemoMode}
                      >
                        ⚡ EXPLORE DEMO BOARD
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </section>

          <section className="ticker" aria-hidden="true">
            <div className="ticker-track">
              <span>
                TASKS WITHOUT THE BORING UI ✦ RFC 3339 SYNC ✦ NO DATABASE ✦ YOUR DATA STAYS IN GOOGLE ✦ ZERO BS ✦
              </span>
              <span>
                TASKS WITHOUT THE BORING UI ✦ RFC 3339 SYNC ✦ NO DATABASE ✦ YOUR DATA STAYS IN GOOGLE ✦ ZERO BS ✦
              </span>
            </div>
          </section>

          <section className="signin-panel">
            <div className="signin-card">
              <p className="brand-line">TASKS RAMASCRIPT</p>
              <h2>GET STARTED.</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void signIn()}
                  disabled={status === "signing-in"}
                >
                  G Continue with Google
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={startDemoMode}
                >
                  ⚡ Launch Demo Sandbox (No Login)
                </button>
              </div>
              <p className="signin-note">
                Need to set up Google OAuth Client ID?{" "}
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    fontWeight: 700,
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onClick={() => setShowSetupModal(true)}
                >
                  Read the setup checklist.
                </button>
              </p>
            </div>
          </section>

          <footer style={{ marginTop: "3rem", padding: "1.5rem 0", borderTop: "3px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              TASKS RAMASCRIPT · TWO-WAY CLIENT FOR GOOGLE TASKS
            </span>
            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              <a href="/privacy" style={{ color: "var(--ink)", textDecoration: "underline" }}>PRIVACY POLICY</a>
              <a href="/terms" style={{ color: "var(--ink)", textDecoration: "underline" }}>TERMS OF SERVICE</a>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }}
                onClick={() => setShowSetupModal(true)}
              >
                GCP GUIDE
              </button>
            </div>
          </footer>
        </main>

        {showSetupModal ? (
          <div
            className="shortcut-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowSetupModal(false)}
          >
            <div
              className="setup-guide-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shortcut-header">
                <span>GOOGLE CLOUD CONSOLE SETUP GUIDE</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowSetupModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 1</span>
                <h4>Authorized JavaScript Origins</h4>
                <p>
                  In Google Cloud Console under <strong>APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs</strong>:
                  Ensure your local and production URLs are added to <strong>Authorized JavaScript origins</strong>:
                </p>
                <div className="setup-code-block">http://localhost:5173</div>
                <div className="setup-code-block">http://127.0.0.1:5173</div>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 2</span>
                <h4>Enable Google Tasks API</h4>
                <p>
                  Go to <strong>APIs & Services &gt; Library</strong>, search for <strong>Google Tasks API</strong>, and click <strong>Enable</strong>.
                </p>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 3</span>
                <h4>OAuth Consent Screen Scopes</h4>
                <p>
                  Under <strong>APIs & Services &gt; OAuth consent screen</strong>, ensure these scopes are added:
                </p>
                <div className="setup-code-block">https://www.googleapis.com/auth/tasks</div>
                <div className="setup-code-block">openid, email, profile</div>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 4</span>
                <h4>Add Test Users (If App is in Testing)</h4>
                <p>
                  If your app status is <strong>Testing</strong>, Google blocks non-test accounts. Add your Google email address to the <strong>Test Users</strong> list in the OAuth consent screen.
                </p>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 5</span>
                <h4>Environment Variable</h4>
                <p>
                  Make sure your client ID is set in <code>.env</code>:
                </p>
                <div className="setup-code-block">VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowSetupModal(false)}
                >
                  GOT IT, CLOSE
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const statusText =
    syncStatus === "syncing"
      ? "◌ SYNCING..."
      : syncStatus === "error"
        ? "! SYNC ERROR"
        : session.isDemo
          ? "● DEMO MODE"
          : "● SYNCED";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="brand-lockup">
            <span className="brand-block">TASKS RAMASCRIPT</span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Collapse sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Task navigation">
          <p className="label">VIEWS</p>
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            const count = listStats[item.value];
            return (
              <button
                key={item.value}
                type="button"
                className={`nav-pill ${filter === item.value ? "active" : ""}`}
                onClick={() => setFilter(item.value)}
              >
                <Icon size={14} />
                {item.label}
                <span className="nav-count">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section">
          <p className="label">MY LISTS</p>
          <div className="list-stack">
            {taskLists.map((list) => (
              <div
                key={list.id}
                className={`list-row ${selectedListId === list.id ? "selected" : ""}`}
              >
                <button
                  type="button"
                  className="list-name"
                  onClick={() => void setList(list.id)}
                >
                  {list.title}
                </button>
                <div className="list-actions">
                  <button
                    type="button"
                    className="mini-button"
                    aria-label={`Rename ${list.title}`}
                    onClick={() => void handleRenameList(list.id, list.title)}
                  >
                    RENAME
                  </button>
                  <button
                    type="button"
                    className="mini-button danger"
                    aria-label={`Delete ${list.title}`}
                    onClick={() => void handleDeleteList(list.id)}
                  >
                    DEL
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showNewListInput ? (
            <div className="inline-create">
              <input
                type="text"
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="Name your list..."
                aria-label="New list name"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateList();
                  }
                }}
              />
              <button
                type="button"
                className="primary-button tiny"
                onClick={() => void handleCreateList()}
              >
                CREATE
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="nav-pill create-button"
              onClick={() => setShowNewListInput(true)}
            >
              <Plus size={14} />
              NEW LIST
            </button>
          )}
        </div>

        <div className="sidebar-footer">
          <div className={`sync-indicator ${syncStatus}`}>{statusText}</div>
          <div className="account-card">
            {user?.picture ? (
              <img
                className="account-avatar"
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div>
              <div style={{ fontWeight: 800 }}>{user?.name ?? "Logged In"}</div>
              <div style={{ opacity: 0.7, fontSize: "0.6rem" }}>
                {user?.email ?? "Google Account"}
              </div>
            </div>
          </div>

          {session.isDemo ? (
            <button
              type="button"
              className="primary-button tiny"
              onClick={() => void signIn()}
            >
              CONNECT GOOGLE TASKS
            </button>
          ) : (
            <button
              type="button"
              className="ghost-button"
              onClick={startDemoMode}
            >
              SWITCH TO DEMO
            </button>
          )}

          <button
            type="button"
            className="ghost-button"
            onClick={signOut}
          >
            <LogOut size={16} />
            SIGN OUT
          </button>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", fontSize: "0.62rem", fontWeight: 700, fontFamily: "var(--font-mono)", opacity: 0.7, paddingTop: "0.25rem" }}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "underline" }}>PRIVACY</a>
            <span>·</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", textDecoration: "underline" }}>TERMS</a>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="panel-header">
          <div className="header-left">
            {!sidebarOpen ? (
              <button
                type="button"
                className="icon-button"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeftOpen size={18} />
              </button>
            ) : null}
            <div>
              <p className="eyebrow">{activeFilterLabel} VIEW</p>
              <h1>{selectedList?.title ?? "TASKS"}</h1>
            </div>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              title="Google Cloud Setup Guide"
              aria-label="Google Cloud Setup Guide"
              onClick={() => setShowSetupModal(true)}
            >
              <HelpCircle size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Keyboard shortcuts"
              aria-label="Keyboard shortcuts"
              onClick={() => setShowShortcuts(true)}
            >
              ?
            </button>
            <button
              type="button"
              className="icon-button"
              title="Toggle theme"
              aria-label="Toggle dark mode"
              onClick={() => setDarkMode((value) => !value)}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {session.isDemo ? (
          <div className="demo-banner">
            <span>⚡ DEMO SANDBOX ACTIVE · RUNNING LOCALLY WITH MOCK DATA</span>
            <div className="demo-banner-actions">
              <button
                type="button"
                className="mini-button"
                onClick={() => setShowSetupModal(true)}
              >
                GCP GUIDE
              </button>
              <button
                type="button"
                className="mini-button"
                onClick={() => void signIn()}
              >
                CONNECT GOOGLE ACCOUNT
              </button>
            </div>
          </div>
        ) : null}

        {authExpired ? (
          <div className="auth-expired-banner">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertCircle size={18} />
              <span>GOOGLE SESSION EXPIRED — PLEASE RECONNECT TO SYNC</span>
            </div>
            <div className="demo-banner-actions">
              <button
                type="button"
                className="primary-button tiny"
                onClick={() => void signIn()}
              >
                RECONNECT NOW
              </button>
              <button
                type="button"
                className="mini-button"
                onClick={startDemoMode}
              >
                USE DEMO MODE
              </button>
              <button
                type="button"
                className="mini-button"
                onClick={() => setAuthExpired(false)}
              >
                DISMISS
              </button>
            </div>
          </div>
        ) : null}

        {!isOnline ? (
          <div className="offline-banner">
            OFFLINE — GOOGLE SYNC UNAVAILABLE.
          </div>
        ) : null}

        <section className="toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              id="task-search"
              type="text"
              value={search}
              placeholder="Filter tasks by name or notes... (Press '/' to focus)"
              aria-label="Search tasks"
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="filter-bar" aria-label="Task filters">
            {filterLabels.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`filter-pill ${filter === item.value ? "active" : ""}`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                <span className="filter-count">{listStats[item.value]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="task-composer">
          <div className="composer-main-row">
            <input
              id="quick-task-input"
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="What needs to be done? (Press 'N' to focus, 'Enter' to add)"
              aria-label="Add a task"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCreateTask();
                }
              }}
            />
            <button
              type="button"
              className="primary-button"
              onClick={handleCreateTask}
            >
              ADD TASK
            </button>
          </div>

          {showNotesField ? (
            <textarea
              className="composer-notes-area"
              placeholder="Optional notes or details for this task..."
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleCreateTask();
                }
              }}
            />
          ) : null}

          <div className="composer-options-row">
            <div className="chip-group">
              <span className="microcopy" style={{ marginRight: "0.2rem" }}>
                DUE:
              </span>
              <button
                type="button"
                className={`chip ${newTaskDueChip === "none" ? "active" : ""}`}
                onClick={() => setNewTaskDueChip("none")}
              >
                NO DUE
              </button>
              <button
                type="button"
                className={`chip ${newTaskDueChip === "today" ? "active" : ""}`}
                onClick={() => setNewTaskDueChip("today")}
              >
                TODAY
              </button>
              <button
                type="button"
                className={`chip ${newTaskDueChip === "tomorrow" ? "active" : ""}`}
                onClick={() => setNewTaskDueChip("tomorrow")}
              >
                TOMORROW
              </button>
              <button
                type="button"
                className={`chip ${newTaskDueChip === "next-week" ? "active" : ""}`}
                onClick={() => setNewTaskDueChip("next-week")}
              >
                NEXT WEEK
              </button>
              <button
                type="button"
                className={`chip ${newTaskDueChip === "custom" ? "active" : ""}`}
                onClick={() => setNewTaskDueChip("custom")}
              >
                <Calendar size={12} /> PICK DATE
              </button>
              {newTaskDueChip === "custom" ? (
                <input
                  type="date"
                  className="chip-custom-date"
                  value={newTaskCustomDue}
                  onChange={(e) => setNewTaskCustomDue(e.target.value)}
                />
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                className={`chip ${showNotesField ? "active" : ""}`}
                onClick={() => setShowNotesField((v) => !v)}
              >
                {showNotesField ? "- HIDE NOTES" : "+ ADD NOTES"}
              </button>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <section className="task-list-panel" aria-live="polite">
            {loading ? (
              <div className="loading-state">
                <span>LOADING TASKS...</span>
                <div className="load-bars">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}

            {!loading && !visibleTasks.length ? (
              <div className="empty-state">
                <p>NO TASKS IN THIS VIEW.</p>
                <h3>ALL CLEAR.</h3>
                <p>READY FOR NEW OBJECTIVES.</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    document.getElementById("quick-task-input")?.focus()
                  }
                >
                  + ADD NEW TASK
                </button>
              </div>
            ) : null}

            {!loading && visibleTasks.length > 0 ? (
              <div className="task-rows">
                <div className="task-count-row">
                  <span>{taskCountLabel}</span>
                </div>
                {visibleTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const today = isDueToday(task.due);
                  const tomorrow = isDueTomorrow(task.due);

                  return (
                    <article
                      key={task.id}
                      className={`task-item ${selectedTaskId === task.id ? "selected" : ""}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <button
                        type="button"
                        className={`task-check ${task.status === "completed" ? "done" : ""}`}
                        aria-label={
                          task.status === "completed"
                            ? "Mark uncompleted"
                            : "Mark completed"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggleComplete(task);
                        }}
                      >
                        {task.status === "completed" ? (
                          <Check size={16} />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>

                      <div className="task-main">
                        <div
                          className={`task-title ${task.status === "completed" ? "done" : ""}`}
                        >
                          {task.title}
                        </div>
                        {task.notes ? (
                          <p className="task-notes">{task.notes}</p>
                        ) : null}

                        {task.due ? (
                          <div style={{ marginTop: "0.35rem" }}>
                            {overdue ? (
                              <span className="date-badge overdue">
                                <AlertCircle size={12} /> OVERDUE · {formatDue(task.due)}
                              </span>
                            ) : today ? (
                              <span className="date-badge today">
                                <Calendar size={12} /> DUE TODAY
                              </span>
                            ) : tomorrow ? (
                              <span className="date-badge upcoming">
                                <Calendar size={12} /> DUE TOMORROW
                              </span>
                            ) : (
                              <span className="date-badge upcoming">
                                <Calendar size={12} /> {formatDue(task.due)}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="task-item-actions">
                        <button
                          type="button"
                          className="task-action-btn danger"
                          title="Delete task"
                          aria-label={`Delete ${task.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void removeTask(task.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>

          <aside className="editor-panel">
            {!selectedTask ? (
              <div className="editor-empty">
                <p>SELECT A TASK.</p>
                <span>CLICK ANY ITEM TO INSPECT & EDIT.</span>
              </div>
            ) : (
              <TaskEditor
                key={selectedTask.id}
                task={selectedTask}
                taskLists={taskLists}
                selectedListId={selectedListId}
                onClose={() => setSelectedTaskId(null)}
                onSave={handleSaveTask}
                onDelete={(taskId) => void removeTask(taskId)}
                onMoveToList={(taskId, targetListId) =>
                  void moveTask(taskId, targetListId)
                }
                onToggleStatus={handleToggleComplete}
              />
            )}
          </aside>
        </div>

        {showShortcuts ? (
          <div
            className="shortcut-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowShortcuts(false)}
          >
            <div
              className="shortcut-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shortcut-header">
                <span>KEYBOARD SHORTCUTS</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowShortcuts(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="shortcut-list">
                {shortcutRows.map(({ keys, label }) => (
                  <div key={keys} className="shortcut-row">
                    <span className="keycap">{keys}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {showSetupModal ? (
          <div
            className="shortcut-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowSetupModal(false)}
          >
            <div
              className="setup-guide-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shortcut-header">
                <span>GOOGLE CLOUD CONSOLE SETUP GUIDE</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowSetupModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 1</span>
                <h4>Authorized JavaScript Origins</h4>
                <p>
                  In Google Cloud Console under <strong>APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs</strong>:
                  Ensure your local and production URLs are added to <strong>Authorized JavaScript origins</strong>:
                </p>
                <div className="setup-code-block">http://localhost:5173</div>
                <div className="setup-code-block">http://127.0.0.1:5173</div>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 2</span>
                <h4>Enable Google Tasks API</h4>
                <p>
                  Go to <strong>APIs & Services &gt; Library</strong>, search for <strong>Google Tasks API</strong>, and click <strong>Enable</strong>.
                </p>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 3</span>
                <h4>OAuth Consent Screen Scopes</h4>
                <p>
                  Under <strong>APIs & Services &gt; OAuth consent screen</strong>, ensure these scopes are added:
                </p>
                <div className="setup-code-block">https://www.googleapis.com/auth/tasks</div>
                <div className="setup-code-block">openid, email, profile</div>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 4</span>
                <h4>Add Test Users (If App is in Testing)</h4>
                <p>
                  If your app status is <strong>Testing</strong>, Google blocks non-test accounts. Add your Google email address to the <strong>Test Users</strong> list in the OAuth consent screen.
                </p>
              </div>

              <div className="setup-step">
                <span className="setup-step-tag">STEP 5</span>
                <h4>Environment Variable</h4>
                <p>
                  Make sure your client ID is set in <code>.env</code>:
                </p>
                <div className="setup-code-block">VITE_GOOGLE_CLIENT_ID=713710393955-n7ajcagu2n77foepjs1qddbm92ucdptl.apps.googleusercontent.com</div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowSetupModal(false)}
                >
                  GOT IT, CLOSE
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {taskError ? <div className="toast">{taskError}</div> : null}
    </div>
  );
}

export default App;