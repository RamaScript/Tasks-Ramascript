import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  GitBranch,
  HelpCircle,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import "./App.css";
import { MasonryView } from "./components/MasonryView";
import { CompletedSection } from "./components/CompletedSection";
import { InlineTaskComposer } from "./components/InlineTaskComposer";
import { QuickAddModal } from "./components/QuickAddModal";
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
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
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
        if (showQuickAddModal) { setShowQuickAddModal(false); return; }
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

      if (key === "n") {
        event.preventDefault();
        setShowQuickAddModal(true);
        return;
      }

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
        <header className="landing-topbar">
          <div className="brand-wrap">
            <span className="brand-block">TASKS</span>
            <span className="brand-sub">RAMASCRIPT</span>
          </div>
          <div className="landing-topbar-actions">
            <button
              type="button"
              className="ghost-button icon-only"
              onClick={() => setDarkMode((v) => !v)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setShowSetupModal(true)}
            >
              <HelpCircle size={15} /> GCP Guide
            </button>
            <button
              type="button"
              className="secondary-button tiny"
              onClick={startDemoMode}
            >
              <Sparkles size={14} /> Demo Mode
            </button>
          </div>
        </header>

        <main className="landing-main">
          <section className="landing-hero">
            <div className="hero-badge">
              <span className="pulse-dot" /> GOOGLE TASKS · MINIMAL GLASS
            </div>
            <h1 className="hero-headline">
              Organize anything.
              <br />
              <span className="highlight-text">Visually fast.</span>
            </h1>
            <p className="hero-subline">
              An ultra-minimal Pinterest board view for Google Tasks.
              Instant two-way sync, rapid entry, nested subtasks, and zero clutter.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                className="google-signin-btn"
                onClick={() => void signIn()}
                disabled={status === "signing-in"}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{status === "signing-in" ? "Connecting to Google..." : "Continue with Google"}</span>
              </button>

              <button
                type="button"
                className="secondary-button hero-secondary"
                onClick={startDemoMode}
              >
                <Sparkles size={16} /> Explore Demo Sandbox
              </button>
            </div>

            {status === "error" && error ? (
              <div className="landing-error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="hero-features-row">
              <div className="hero-feature-item">
                <Zap size={14} /> 2-Way Google Sync
              </div>
              <div className="hero-feature-item">
                <LayoutGrid size={14} /> Pinterest Masonry
              </div>
              <div className="hero-feature-item">
                <ShieldCheck size={14} /> 100% Private Client
              </div>
            </div>
          </section>

          {/* Realistic Pinterest Board Showcase Preview */}
          <section className="landing-preview-board">
            <div className="preview-board-header">
              <div className="preview-dot red" />
              <div className="preview-dot yellow" />
              <div className="preview-dot green" />
              <span className="preview-title">tasks.google.com · Live Preview</span>
            </div>

            <div className="preview-board-cards">
              <div className="preview-card" style={{ "--card-accent": "#6366f1" } as React.CSSProperties}>
                <div className="preview-card-tag" style={{ color: "#6366f1", borderColor: "rgba(99, 102, 241, 0.2)" }}>Focus</div>
                <h4>Design System &amp; Pinterest Flow</h4>
                <p>Multi-column masonry grid with color-coded list bars and rapid task composer.</p>
                <div className="preview-card-meta">
                  <span className="preview-chip"><Calendar size={11} /> Today</span>
                  <span className="preview-chip"><GitBranch size={11} /> 2/3</span>
                </div>
              </div>

              <div className="preview-card" style={{ "--card-accent": "#06b6d4" } as React.CSSProperties}>
                <div className="preview-card-tag" style={{ color: "#0891b2", borderColor: "rgba(6, 182, 212, 0.2)" }}>Architecture</div>
                <h4>Two-Way Direct Google Sync</h4>
                <p>Private client-side connection straight to Google Tasks API with instant local cache.</p>
                <div className="preview-card-meta">
                  <span className="preview-chip"><CheckCircle2 size={12} color="#10b981" /> Completed</span>
                </div>
              </div>

              <div className="preview-card" style={{ "--card-accent": "#10b981" } as React.CSSProperties}>
                <div className="preview-card-tag" style={{ color: "#059669", borderColor: "rgba(16, 185, 129, 0.2)" }}>Personal</div>
                <h4>Quarterly Goals &amp; Deep Work</h4>
                <p>Distraction-free workspace with keyboard shortcuts (? key) and slide-over inspector.</p>
                <div className="preview-card-meta">
                  <span className="preview-chip"><Calendar size={11} /> Tomorrow</span>
                </div>
              </div>
            </div>
          </section>

          <footer className="landing-footer">
            <span className="landing-footer-copy">
              TASKS RAMASCRIPT · AUTHENTIC GOOGLE TASKS CLIENT
            </span>
            <div className="landing-footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => setShowSetupModal(true)}
              >
                GCP Setup
              </button>
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
              <span>GOOGLE SYNC PAUSED — PLEASE RECONNECT TO RESUME SYNC</span>
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

            {loading && taskLists.length === 0 ? (
              <div className="loading-state board-loading">
                <span>LOADING BOARDS...</span>
                <div className="load-bars"><span /><span /><span /></div>
              </div>
            ) : (
              <MasonryView
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
                autoListenKey={true}
              />

              {loading && visibleActiveTasks.length === 0 ? (
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

        {/* Global Floating Action Button for rapid task entry */}
        <button
          type="button"
          className="global-fab-btn"
          onClick={() => setShowQuickAddModal(true)}
          title="Add a task (N)"
          aria-label="Add a task"
        >
          <Plus size={20} />
          <span>Add task</span>
        </button>
      </main>

      {showQuickAddModal ? (
        <QuickAddModal
          taskLists={taskLists}
          defaultListId={selectedListId}
          onClose={() => setShowQuickAddModal(false)}
          onAddTask={(title, extra, targetList) =>
            void addTask(title, extra, targetList)
          }
        />
      ) : null}
      {showShortcuts ? <ShortcutsModal onClose={() => setShowShortcuts(false)} /> : null}
      {showSetupModal ? <SetupGuideModal onClose={() => setShowSetupModal(false)} /> : null}
      {taskError ? <div className="toast">{taskError}</div> : null}
    </div>
  );
}

export default App;
