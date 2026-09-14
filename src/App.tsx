import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleDashed,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useTasks } from "./hooks/useTasks";
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
  { keys: "ESC", label: "close editor" },
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
  onGoToList: (listId: string) => void;
}

function TaskEditor({
  task,
  taskLists,
  selectedListId,
  onClose,
  onSave,
  onDelete,
  onGoToList,
}: TaskEditorProps) {
  const [draft, setDraft] = useState({
    title: task.title,
    notes: task.notes ?? "",
    due: task.due ?? "",
  });

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
        <span>DETAILS</span>
        <textarea
          value={draft.notes}
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
        <label className="field-block half">
          <span>DUE</span>
          <input
            type="date"
            value={draft.due}
            onChange={(event) =>
              setDraft((current) => ({ ...current, due: event.target.value }))
            }
          />
        </label>

        <label className="field-block half">
          <span>GO TO LIST</span>
          <select
            value={selectedListId}
            onChange={(event) => onGoToList(event.target.value)}
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
          <Check size={16} /> SAVE
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
  const { session, user, status, error, signIn, signOut } = useGoogleAuth();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
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
    addList,
    removeList,
    renameList,
    getFilteredTasks,
  } = useTasks({ accessToken });

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

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    void addTask(newTaskTitle);
    setNewTaskTitle("");
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
            <span className="brand-block">TASKO</span>
          </div>
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
                Your data stays in Google. We just give it a better home.
              </p>

              <div className="cta-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void signIn()}
                  disabled={status === "signing-in"}
                >
                  {status === "signing-in" ? (
                    "SIGNING IN..."
                  ) : (
                    <>
                      CONTINUE WITH GOOGLE <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {status === "error" && error ? (
                <p className="error-block">{error}</p>
              ) : null}

              <p className="microcopy">
                NO ACCOUNT TO CREATE. NO DATABASE. NO BS.
              </p>
            </div>

            <div className="hero-aside">
              <div className="mini-app-shell">
                <div className="mini-app-header">
                  <span>TASKO</span>
                  <span className="sync-pill synced">● SYNCED</span>
                </div>
                <div className="mini-app-body">
                  <aside className="mini-side">
                    <div className="mini-line active">TODAY</div>
                    <div className="mini-line">PERSONAL</div>
                    <div className="mini-line">WORK</div>
                  </aside>
                  <section className="mini-main">
                    <div className="mini-main-header">12 TASKS</div>
                    <div className="task-row">
                      <span className="checkbox empty" />
                      <span>Finish homepage</span>
                    </div>
                    <div className="task-row">
                      <span className="checkbox empty" />
                      <span>Reply to Nikhil</span>
                    </div>
                    <div className="task-row done">
                      <span className="checkbox done" />
                      <span>Buy groceries</span>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </section>

          <section className="signin-panel">
            <div className="signin-card">
              <p className="brand-line">TASKO</p>
              <h2>SIGN IN.</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void signIn()}
                disabled={status === "signing-in"}
              >
                G Continue with Google
              </button>
              <p className="signin-note">
                By continuing, you allow Tasko to access your Google Tasks.
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const statusText =
    syncStatus === "syncing"
      ? "◌ SYNCING..."
      : syncStatus === "error"
        ? "! SYNC ERROR"
        : "● SYNCED";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <div className="brand-lockup">
            <span className="brand-block">TASKO</span>
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
          <p className="label">TASKS</p>
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
            <span>{user?.email ?? "Google account"}</span>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={signOut}
          >
            <LogOut size={16} />
            SIGN OUT
          </button>
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
              aria-label="Keyboard shortcuts"
              onClick={() => setShowShortcuts(true)}
            >
              ?
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Toggle dark mode"
              onClick={() => setDarkMode((value) => !value)}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

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
              placeholder="Find something..."
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
          <input
            id="quick-task-input"
            type="text"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            placeholder="What needs to be done?"
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
            onClick={() => void handleCreateTask()}
          >
            ADD TASK
          </button>
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
                <p>NO TASKS.</p>
                <h3>GOOD.</h3>
                <p>YOU'RE DONE.</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    document.getElementById("quick-task-input")?.focus()
                  }
                >
                  + ADD TASK
                </button>
              </div>
            ) : null}

            {!loading && visibleTasks.length > 0 ? (
              <div className="task-rows">
                <div className="task-count-row">
                  <span>{taskCountLabel}</span>
                </div>
                {visibleTasks.map((task) => (
                  <article
                    key={task.id}
                    className={`task-item ${selectedTaskId === task.id ? "selected" : ""}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <button
                      type="button"
                      className="task-check"
                      aria-label={
                        task.status === "completed"
                          ? "Mark uncompleted"
                          : "Mark completed"
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleComplete(task);
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
                        <p
                          className={`task-date ${isOverdue(task) ? "overdue" : ""}`}
                        >
                          {formatDue(task.due)}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <aside className="editor-panel">
            {!selectedTask ? (
              <div className="editor-empty">
                <p>SELECT A TASK.</p>
                <span>CLICK ANY ITEM TO EDIT.</span>
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
                onGoToList={(listId) => void setList(listId)}
              />
            )}
          </aside>
        </div>

        {showShortcuts ? (
          <div className="shortcut-overlay" role="dialog" aria-modal="false">
            <div className="shortcut-box">
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
      </main>

      {taskError ? <div className="toast">{taskError}</div> : null}
    </div>
  );
}

export default App;