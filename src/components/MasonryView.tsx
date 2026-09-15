import { useState } from "react";
import { Plus, X, LayoutGrid, Columns } from "lucide-react";
import type { Task, TaskList } from "../types/tasks";
import { TaskCard } from "./TaskCard";
import { BoardColumn } from "./BoardColumn";

interface MasonryViewProps {
  taskLists: TaskList[];
  tasksByList: Record<string, Task[]>;
  subtasksMap: Record<string, Task[]>;
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onAddTask: (title: string, extra?: { notes?: string; due?: string; starred?: boolean }, targetList?: string) => void;
  onToggleComplete: (task: Task) => void;
  onToggleStar: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddList: (title: string) => void;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onClearCompleted: (listId: string) => void;
}

const COLUMN_COLORS = [
  "#ffe600",
  "#06b6d4",
  "#10b981",
  "#8b5cf6",
  "#3b82f6",
  "#f43f5e",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
];

export function MasonryView({
  taskLists,
  tasksByList,
  subtasksMap,
  selectedTaskId,
  onSelectTask,
  onAddTask,
  onToggleComplete,
  onToggleStar,
  onDeleteTask,
  onAddList,
  onRenameList,
  onDeleteList,
  onClearCompleted,
}: MasonryViewProps) {
  const [viewMode, setViewMode] = useState<"masonry" | "columns">("masonry");
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [filterListId, setFilterListId] = useState<string | null>(null);

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    onAddList(newListName.trim());
    setNewListName("");
    setShowAddList(false);
  };

  // Build all top-level active + completed cards across all lists
  const allCards: Array<{
    task: Task;
    list: TaskList;
    listColor: string;
    subtaskCount: number;
    completedSubtaskCount: number;
  }> = [];

  const listsToShow = filterListId
    ? taskLists.filter((l) => l.id === filterListId)
    : taskLists;

  for (const list of listsToShow) {
    const idx = taskLists.indexOf(list);
    const color = COLUMN_COLORS[idx % COLUMN_COLORS.length];
    const listTasks = tasksByList[list.id] ?? [];
    const topLevel = listTasks.filter((t) => !t.parent);
    for (const task of topLevel) {
      const subs = subtasksMap[task.id] ?? [];
      const completedSubs = subs.filter((s) => s.status === "completed").length;
      allCards.push({
        task,
        list,
        listColor: color,
        subtaskCount: subs.length,
        completedSubtaskCount: completedSubs,
      });
    }
  }

  // Separate active vs completed
  const activeCards = allCards.filter((c) => c.task.status === "needsAction");
  const completedCards = allCards.filter((c) => c.task.status === "completed");

  return (
    <div className="masonry-view">
      {/* Toolbar: view toggle + list filter + add list */}
      <div className="masonry-toolbar">
        <div className="masonry-filter-pills">
          <button
            type="button"
            className={`filter-pill${filterListId === null ? " active" : ""}`}
            onClick={() => setFilterListId(null)}
          >
            All
          </button>
          {taskLists.map((list, idx) => (
            <button
              key={list.id}
              type="button"
              className={`filter-pill${filterListId === list.id ? " active" : ""}`}
              onClick={() => setFilterListId(filterListId === list.id ? null : list.id)}
              style={{
                "--pill-color": COLUMN_COLORS[idx % COLUMN_COLORS.length],
              } as React.CSSProperties}
            >
              <span
                className="filter-pill-dot"
                style={{ background: COLUMN_COLORS[idx % COLUMN_COLORS.length] }}
              />
              {list.title}
            </button>
          ))}
        </div>

        <div className="masonry-toolbar-right">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn${viewMode === "masonry" ? " active" : ""}`}
              title="Pinterest / masonry view"
              onClick={() => setViewMode("masonry")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`view-mode-btn${viewMode === "columns" ? " active" : ""}`}
              title="Column view"
              onClick={() => setViewMode("columns")}
            >
              <Columns size={15} />
            </button>
          </div>

          {showAddList ? (
            <div className="masonry-add-list-inline">
              <input
                type="text"
                autoFocus
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleCreateList(); }
                  else if (e.key === "Escape") { setShowAddList(false); setNewListName(""); }
                }}
              />
              <button type="button" className="primary-button tiny" onClick={handleCreateList}>Create</button>
              <button type="button" className="icon-button" onClick={() => { setShowAddList(false); setNewListName(""); }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="secondary-button tiny"
              onClick={() => setShowAddList(true)}
            >
              <Plus size={14} /> New list
            </button>
          )}
        </div>
      </div>

      {/* ── MASONRY VIEW ── */}
      {viewMode === "masonry" ? (
        <div className="masonry-scroll-area">
          {activeCards.length === 0 && completedCards.length === 0 ? (
            <div className="masonry-empty">
              <p>No tasks yet</p>
              <span>Create a list and add some tasks to get started</span>
            </div>
          ) : (
            <>
              {activeCards.length > 0 ? (
                <div className="masonry-grid">
                  {activeCards.map(({ task, list, listColor, subtaskCount, completedSubtaskCount }) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      listName={list.title}
                      listColor={listColor}
                      subtaskCount={subtaskCount}
                      completedSubtaskCount={completedSubtaskCount}
                      isSelected={selectedTaskId === task.id}
                      onSelectTask={onSelectTask}
                      onToggleComplete={onToggleComplete}
                      onToggleStar={onToggleStar}
                      onDeleteTask={onDeleteTask}
                    />
                  ))}
                </div>
              ) : null}

              {completedCards.length > 0 ? (
                <div className="masonry-completed-section">
                  <div className="masonry-section-divider">
                    <span>Completed ({completedCards.length})</span>
                  </div>
                  <div className="masonry-grid masonry-grid--faded">
                    {completedCards.map(({ task, list, listColor, subtaskCount, completedSubtaskCount }) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        listName={list.title}
                        listColor={listColor}
                        subtaskCount={subtaskCount}
                        completedSubtaskCount={completedSubtaskCount}
                        isSelected={selectedTaskId === task.id}
                        onSelectTask={onSelectTask}
                        onToggleComplete={onToggleComplete}
                        onToggleStar={onToggleStar}
                        onDeleteTask={onDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        /* ── COLUMNS VIEW ── */
        <div className="board-view-container">
          <div className="board-columns-track">
            {listsToShow.map((list, index) => {
              const listTasks = tasksByList[list.id] ?? [];
              const color = COLUMN_COLORS[taskLists.indexOf(list) % COLUMN_COLORS.length];
              return (
                <BoardColumn
                  key={list.id}
                  list={list}
                  tasks={listTasks}
                  subtasksMap={subtasksMap}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={onSelectTask}
                  onAddTask={onAddTask}
                  onToggleComplete={onToggleComplete}
                  onToggleStar={onToggleStar}
                  onDeleteTask={onDeleteTask}
                  onRenameList={onRenameList}
                  onDeleteList={onDeleteList}
                  onClearCompleted={onClearCompleted}
                  accentColor={color}
                  index={index}
                />
              );
            })}

            <div className="add-column-card">
              {showAddList ? (
                <div className="add-column-expanded">
                  <input
                    type="text"
                    autoFocus
                    placeholder="List title..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCreateList(); }
                      else if (e.key === "Escape") { setShowAddList(false); setNewListName(""); }
                    }}
                  />
                  <div className="add-column-actions">
                    <button type="button" className="primary-button tiny" onClick={handleCreateList}>Create</button>
                    <button type="button" className="secondary-button tiny" onClick={() => { setShowAddList(false); setNewListName(""); }}><X size={13} /></button>
                  </div>
                </div>
              ) : (
                <button type="button" className="add-column-btn" onClick={() => setShowAddList(true)}>
                  <Plus size={18} /><span>Create new list</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
