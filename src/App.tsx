import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  HelpCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import "./App.css";
import { BoardView } from "./components/BoardView";
import { CompletedSection } from "./components/CompletedSection";
import { InlineTaskComposer } from "./components/InlineTaskComposer";
import { SetupGuideModal } from "./components/SetupGuideModal";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { Sidebar } from "./components/Sidebar";
import { TaskDetailDrawer } from "./components/TaskDetailDrawer";
import { TaskItem } from "./components/TaskItem";
import { TaskListHeader } from "./components/TaskListHeader";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useTasks } from "./hooks/useTasks";
import type { Task } from "./types/tasks";

export function App() {
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
    handleAuthExpired,
  } = useGoogleAuth();

  const [search, setSearch] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const accessToken = session?.accessToken ?? null;
  const {
    taskLists,
    selectedListId,
    selectedList,
    tasksByList,
    activeTasks,
    completedTasks,
    subtasksMap,
    sortMode,
    setSortMode,
    loading,
    error: taskError,
    syncStatus,
    listStats,
    setList,
    addTask,
    addSubtask,
    updateTaskById,
    removeTask,
    moveTask,
    addList,
    removeList,
    renameList,
    clearCompleted,
    toggleStarTask,
    fetchAll,
  } = useTasks({
    accessToken,
    isDemo: session?.isDemo,
    onAuthExpired: handleAuthExpired,
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

      if (event.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showSetupModal) { setShowSetupModal(false); return; }
        if (selectedTaskId) { setSelectedTaskId(null); return; }
      }

      if (isTyping) return;

      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "j" || key === "k") {
        event.preventDefault();
        if (activeTasks.length === 0) return;
        const currentIndex = activeTasks.findIndex((t) => t.id === selectedTaskId);
        let nextIndex = 0;
        if (currentIndex !== -1) {
          nextIndex = key === "j"
            ? Math.min(currentIndex + 1, activeTasks.length - 1)
            : Math.max(currentIndex - 1, 0);
        }
        setSelectedTaskId(activeTasks[nextIndex]?.id ?? null);
        return;
      }

      if (key === "c" && selectedTaskId) {
        event.preventDefault();
        const currentTask =
          activeTasks.find((t) => t.id === selectedTaskId) ??
          completedTasks.find((t) => t.id === selectedTaskId);
        if (currentTask) handleToggleComplete(currentTask);
        return;
      }

      if (key === "s" && selectedTaskId) {
        event.preventDefault();
        toggleStarTask(selectedTaskId);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const visibleActiveTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeTasks;
    return activeTasks.filter((task) =>
      `${task.title} ${task.notes ?? ""}`.toLowerCase().includes(term)
    );
  }, [activeTasks, search]);

  const visibleCompletedTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return completedTasks;
    return completedTasks.filter((task) =>
      `${task.title} ${task.notes ?? ""}`.toLowerCase().includes(term)
    );
  }, [completedTasks, search]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    for (const listTasks of Object.values(tasksByList)) {
      const found = listTasks.find((t) => t.id === selectedTaskId);
      if (found) return found;
    }
    return (
      activeTasks.find((t) => t.id === selectedTaskId) ??
      completedTasks.find((t) => t.id === selectedTaskId) ??
      null
    );
  }, [tasksByList, activeTasks, completedTasks, selectedTaskId]);

  const isBoardView = selectedListId === "all";

  // ── Unauthenticated Landing Page ─────────────────────────────────────────────
  if (!session) {
    return (
      <div className="landing-shell">
        <header className="topbar landing-topbar">
          <div className="brand-wrap">
            <span className="brand-block">TASKS RAMASCRIPT</span>
          </div>
          <button type="button" className="ghost-button" onClick={() => setShowSetupModal(true)}>
            <HelpCircle size={16} /> GCP SETUP GUIDE
          </button>
        </header>

        <main className="landing-page">
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">AUTHENTIC GOOGLE TASKS // NEO-BRUTALISM</p>
              <h1>TASKS.<br />WITHOUT THE<br />BORING UI.</h1>
              <p className="lede">
                The authentic flow of Google Tasks — multi-column board view, rapid entry, subtasks, starred smart list, and an inspector drawer — built with bold Neo-Brutalism.
                <br />
                Direct two-way sync with Google Cloud, or test offline in Demo Sandbox.
              </p>

              <div className="cta-row">
                <button type="button" className="primary-button" onClick={() => void signIn()} disabled={status === "signing-in"}>
                  {status === "signing-in" ? "CONNECTING TO GOOGLE..." : <><span>CONTINUE WITH GOOGLE</span> <ChevronRight size={16} /></>}
                </button>
                <button type="button" className="secondary-button" onClick={startDemoMode}>
                  <Sparkles size={16} /> TRY DEMO SANDBOX
                </button>
              </div>

              {status === "error" && error ? (
                <div className="error-block">
                  <p><strong>AUTH NOTICE:</strong> {error}</p>
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <button type="button" className="mini-button" onClick={startDemoMode}>OPEN DEMO MODE</button>
                    <button type="button" className="mini-button" onClick={() => setShowSetupModal(true)}>VIEW SETUP INSTRUCTIONS</button>
                  </div>
                </div>
              ) : null}

              <p className="microcopy">NO DATABASE · GOOGLE DIRECT API · 100% PRIVATE · TWO-WAY SYNC</p>
            </div>

            <div className="hero-aside">
              <div className="mini-app-shell">
                <div className="mini-app-header">
                  <span>TASKS RAMASCRIPT</span>
                  <span className="sync-pill synced">● READY</span>
                </div>
                <div className="mini-app-body">
                  <aside className="mini-side">
                    <div className="mini-line active">⊞ ALL BOARDS</div>
                    <div className="mini-line">★ STARRED</div>
                    <div className="mini-line">FOCUS SPRINT</div>
                    <div className="mini-line">PERSONAL</div>
                  </aside>
                  <section className="mini-main">
                    <div className="mini-main-header">BOARD VIEW</div>
                    <div className="task-row">
                      <span className="checkbox done" />
                      <span>Side-by-side list columns</span>
                    </div>
                    <div className="task-row">
                      <span className="checkbox done" />
                      <span>Slide-over task inspector</span>
                    </div>
                    <div className="task-row">
                      <span className="checkbox empty" />
                      <span>Nested subtasks &amp; starred</span>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <button type="button" className="primary-button tiny" onClick={startDemoMode}>
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
              <span>AUTHENTIC GOOGLE TASKS FLOW ✦ NEO-BRUTALISM ✦ BOARD VIEW ✦ RAPID ENTRY ✦ NESTED SUBTASKS ✦ STARRED SMART LIST ✦ TWO-WAY SYNC ✦ </span>
              <span>AUTHENTIC GOOGLE TASKS FLOW ✦ NEO-BRUTALISM ✦ BOARD VIEW ✦ RAPID ENTRY ✦ NESTED SUBTASKS ✦ STARRED SMART LIST ✦ TWO-WAY SYNC ✦ </span>
            </div>
          </section>

          <footer style={{ marginTop: "3rem", padding: "1.5rem 0", borderTop: "3px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              TASKS RAMASCRIPT · TWO-WAY CLIENT FOR GOOGLE TASKS
            </span>
            <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              <a href="/privacy" style={{ color: "var(--ink)", textDecoration: "underline" }}>PRIVACY POLICY</a>
              <a href="/terms" style={{ color: "var(--ink)", textDecoration: "underline" }}>TERMS OF SERVICE</a>
              <button type="button" style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }} onClick={() => setShowSetupModal(true)}>GCP GUIDE</button>
            </div>
          </footer>
        </main>

        {showSetupModal ? <SetupGuideModal onClose={() => setShowSetupModal(false)} /> : null}
      </div>
    );
  }

  // ── Authenticated App Shell ───────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        taskLists={taskLists}
        selectedListId={selectedListId}
        onSelectList={(id) => void setList(id)}
        onAddList={(name) => void addList(name)}
        onRenameList={(id, name) => void renameList(id, name)}
        onDeleteList={(id) => void removeList(id)}
        starredCount={listStats.starred}
        syncStatus={syncStatus}
        onSync={() => void fetchAll()}
        user={user ?? null}
        isDemo={Boolean(session.isDemo)}
        onSignIn={() => void signIn()}
        onStartDemo={startDemoMode}
        onSignOut={signOut}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenSetupGuide={() => setShowSetupModal(true)}
      />

      <main className={`main-panel${selectedTaskId ? " has-drawer" : ""}${isBoardView ? " board-mode" : ""}`}>
        {session.isDemo ? (
          <div className="demo-banner">
            <span>⚡ DEMO SANDBOX ACTIVE · RUNNING LOCALLY WITH MOCK DATA</span>
            <div className="demo-banner-actions">
              <button type="button" className="mini-button" onClick={() => setShowSetupModal(true)}>GCP GUIDE</button>
              <button type="button" className="mini-button" onClick={() => void signIn()}>CONNECT GOOGLE ACCOUNT</button>
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
              <button type="button" className="primary-button tiny" onClick={() => void signIn(true)}>RECONNECT NOW</button>
              <button type="button" className="mini-button" onClick={startDemoMode}>USE DEMO MODE</button>
              <button type="button" className="mini-button" onClick={() => setAuthExpired(false)}>DISMISS</button>
            </div>
          </div>
        ) : null}

        {!isOnline ? (
          <div className="offline-banner">OFFLINE — GOOGLE SYNC UNAVAILABLE.</div>
        ) : null}

        {/* ── Board View ── */}
        {isBoardView ? (
          <div className="board-area">
            <div className="board-area-header">
              <div className="board-area-title-row">
                {!sidebarOpen ? (
                  <button type="button" className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" title="Open sidebar">☰</button>
                ) : null}
                <h1 className="board-area-title">All Boards</h1>
                <span className="board-list-count">{taskLists.length} list{taskLists.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {loading ? (
              <div className="loading-state board-loading">
                <span>LOADING BOARDS...</span>
                <div className="load-bars"><span /><span /><span /></div>
              </div>
            ) : (
              <BoardView
                taskLists={taskLists}
                tasksByList={tasksByList}
                subtasksMap={subtasksMap}
                selectedTaskId={selectedTaskId}
                onSelectTask={(t) => setSelectedTaskId(t.id)}
                onAddTask={(title, extra, targetList) => void addTask(title, extra, targetList)}
                onToggleComplete={handleToggleComplete}
                onToggleStar={toggleStarTask}
                onDeleteTask={(id) => void removeTask(id)}
                onAddList={(name) => void addList(name)}
                onRenameList={(id, name) => void renameList(id, name)}
                onDeleteList={(id) => void removeList(id)}
                onClearCompleted={(listId) => void clearCompleted(listId)}
              />
            )}
          </div>
        ) : (
          /* ── Single-Column View ── */
          <>
            <TaskListHeader
              selectedList={selectedList}
              isStarredView={selectedListId === "starred"}
              activeCount={activeTasks.length}
              completedCount={completedTasks.length}
              sortMode={sortMode}
              onSelectSortMode={setSortMode}
              sidebarOpen={sidebarOpen}
              onOpenSidebar={() => setSidebarOpen(true)}
              onRenameList={(id, title) => void renameList(id, title)}
              onDeleteList={(id) => void removeList(id)}
              onClearCompleted={() => void clearCompleted()}
            />

            <div className="search-row">
              <div className="search-box">
                <Search size={15} />
                <input
                  id="task-search"
                  type="text"
                  value={search}
                  placeholder="Filter tasks... (Press '/' to focus)"
                  aria-label="Search tasks"
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}>
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="tasks-canvas">
              <InlineTaskComposer
                onAddTask={(title, extra) => void addTask(title, extra)}
                isStarredDefault={selectedListId === "starred"}
              />

              {loading ? (
                <div className="loading-state">
                  <span>LOADING TASKS...</span>
                  <div className="load-bars"><span /><span /><span /></div>
                </div>
              ) : null}

              {!loading && visibleActiveTasks.length === 0 && visibleCompletedTasks.length === 0 ? (
                <div className="empty-state">
                  <p>NO TASKS IN THIS VIEW</p>
                  <h3>ALL CLEAR.</h3>
                  <p>Click &quot;Add a task&quot; above or press &apos;N&apos; to create one.</p>
                </div>
              ) : null}

              {visibleActiveTasks.length > 0 ? (
                <div className="task-stack">
                  {visibleActiveTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      subtasks={subtasksMap[task.id] ?? []}
                      isSelected={selectedTaskId === task.id}
                      onSelectTask={(t) => setSelectedTaskId(t.id)}
                      onToggleComplete={handleToggleComplete}
                      onToggleStar={toggleStarTask}
                      onDeleteTask={(id) => void removeTask(id)}
                    />
                  ))}
                </div>
              ) : null}

              <CompletedSection
                completedTasks={visibleCompletedTasks}
                subtasksMap={subtasksMap}
                selectedTaskId={selectedTaskId}
                onSelectTask={(t) => setSelectedTaskId(t.id)}
                onToggleComplete={handleToggleComplete}
                onToggleStar={toggleStarTask}
                onDeleteTask={(id) => void removeTask(id)}
                onClearCompleted={() => void clearCompleted()}
              />
            </div>
          </>
        )}

        {selectedTask ? (
          <TaskDetailDrawer
            task={selectedTask}
            subtasks={subtasksMap[selectedTask.id] ?? []}
            taskLists={taskLists}
            selectedListId={selectedListId}
            onClose={() => setSelectedTaskId(null)}
            onSave={(taskId, draft) => {
              void updateTaskById(taskId, { title: draft.title, notes: draft.notes, due: draft.due });
            }}
            onDelete={(taskId) => {
              void removeTask(taskId);
              if (selectedTaskId === taskId) setSelectedTaskId(null);
            }}
            onMoveToList={(taskId, targetListId) => { void moveTask(taskId, targetListId); }}
            onToggleStatus={handleToggleComplete}
            onToggleStar={toggleStarTask}
            onAddSubtask={(parentId, subTitle) => void addSubtask(parentId, subTitle)}
          />
        ) : null}
      </main>

      {showShortcuts ? <ShortcutsModal onClose={() => setShowShortcuts(false)} /> : null}
      {showSetupModal ? <SetupGuideModal onClose={() => setShowSetupModal(false)} /> : null}
      {taskError ? <div className="toast">{taskError}</div> : null}
    </div>
  );
}

export default App;
