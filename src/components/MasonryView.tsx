import { useState } from "react";
import { Plus, X, LayoutGrid, Columns } from "lucide-react";
import type { Task, TaskList } from "../types/tasks";
import { TaskCard } from "./TaskCard";
import { BoardColumn } from "./BoardColumn";
import { InlineTaskComposer } from "./InlineTaskComposer";

interface MasonryViewProps {
  taskLists: TaskList[];
  tasksByList: Record<string, Task[]>;
  subtasksMap: Record<string, Task[]>;
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onAddTask: (
    title: string,
    extra?: { notes?: string; due?: string; starred?: boolean },
    targetList?: string,
  ) => void;
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
  const [viewMode, setViewMode] = useState<"columns" | "masonry">("columns");
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [filterListId, setFilterListId] = useState<string | null>(null);

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    onAddList(newListName.trim());
    setNewListName("");
    setShowAddList(false);
  };

  const listsToShow = filterListId
    ? taskLists.filter((l) => l.id === filterListId)
    : taskLists;

  return (
    <div className="masonry-view">
      {/* Top Filter & View Controls Toolbar */}
      <div className="masonry-toolbar">
        <div className="masonry-filter-pills">
          <button
            type="button"
            className={`filter-pill${filterListId === null ? " active" : ""}`}
            onClick={() => setFilterListId(null)}
          >
            All Lists ({taskLists.length})
          </button>
          {taskLists.map((list, idx) => {
            const count = (tasksByList[list.id] ?? []).filter(
              (t) => !t.parent && t.status === "needsAction",
            ).length;
            const color = COLUMN_COLORS[idx % COLUMN_COLORS.length];
            return (
              <button
                key={list.id}
                type="button"
                className={`filter-pill${filterListId === list.id ? " active" : ""}`}
                onClick={() =>
                  setFilterListId(filterListId === list.id ? null : list.id)
                }
              >
                <span
                  className="filter-pill-dot"
                  style={{ background: color }}
                />
                <span>{list.title}</span>
                <span className="filter-pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="masonry-toolbar-right">
          {/* View Toggle: Columns Board vs Grouped Masonry */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn${viewMode === "columns" ? " active" : ""}`}
              title="Board Columns View (side-by-side lists with Pinterest-style cards)"
              onClick={() => setViewMode("columns")}
            >
              <Columns size={15} />
              <span className="view-mode-label">Columns</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn${viewMode === "masonry" ? " active" : ""}`}
              title="Grouped Masonry Grid View"
              onClick={() => setViewMode("masonry")}
            >
              <LayoutGrid size={15} />
              <span className="view-mode-label">Masonry</span>
            </button>
          </div>

          {showAddList ? (
            <div className="masonry-add-list-inline">
              <input
                type="text"
                autoFocus
                placeholder="New list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateList();
                  } else if (e.key === "Escape") {
                    setShowAddList(false);
                    setNewListName("");
                  }
                }}
              />
              <button
                type="button"
                className="primary-button tiny"
                onClick={handleCreateList}
              >
                Create
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setShowAddList(false);
                  setNewListName("");
                }}
              >
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

      {/* ── COLUMNS VIEW (Default): Side-by-side List Columns with Pinterest Cards ── */}
      {viewMode === "columns" ? (
        <div className="board-view-container">
          <div className="board-columns-track">
            {listsToShow.map((list, index) => {
              const listTasks = tasksByList[list.id] ?? [];
              const color =
                COLUMN_COLORS[taskLists.indexOf(list) % COLUMN_COLORS.length];
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

            {/* Add New List Column Card */}
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
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateList();
                      } else if (e.key === "Escape") {
                        setShowAddList(false);
                        setNewListName("");
                      }
                    }}
                  />
                  <div className="add-column-actions">
                    <button
                      type="button"
                      className="primary-button tiny"
                      onClick={handleCreateList}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      className="secondary-button tiny"
                      onClick={() => {
                        setShowAddList(false);
                        setNewListName("");
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="add-column-btn"
                  onClick={() => setShowAddList(true)}
                >
                  <Plus size={18} />
                  <span>Create new list</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── MASONRY VIEW: GROUPED BY LIST! ── */
        <div className="masonry-scroll-area">
          {listsToShow.length === 0 ? (
            <div className="masonry-empty">
              <p>No task lists found</p>
              <span>Click &quot;New list&quot; to create your first list</span>
            </div>
          ) : (
            listsToShow.map((list) => {
              const color =
                COLUMN_COLORS[taskLists.indexOf(list) % COLUMN_COLORS.length];
              const listTasks = tasksByList[list.id] ?? [];
              const topLevel = listTasks.filter((t) => !t.parent);
              const active = topLevel.filter(
                (t) => t.status === "needsAction",
              );
              const completed = topLevel.filter(
                (t) => t.status === "completed",
              );

              return (
                <section key={list.id} className="masonry-list-group">
                  {/* List Group Header */}
                  <div className="masonry-list-group-header">
                    <div className="group-header-left">
                      <span
                        className="group-color-indicator"
                        style={{ backgroundColor: color }}
                      />
                      <h2 className="group-list-title">{list.title}</h2>
                      <span className="group-count-badge">
                        {active.length} active
                      </span>
                    </div>

                    <div className="group-header-actions">
                      <button
                        type="button"
                        className="mini-button"
                        onClick={() => {
                          const title = window.prompt("Task title:");
                          if (title?.trim()) {
                            onAddTask(title.trim(), undefined, list.id);
                          }
                        }}
                      >
                        <Plus size={13} /> Add task
                      </button>
                    </div>
                  </div>

                  {/* Inline composer for rapid entry in this group */}
                  <div className="group-composer-wrap">
                    <InlineTaskComposer
                      onAddTask={(title, extra) =>
                        onAddTask(title, extra, list.id)
                      }
                      placeholder={`Add task to ${list.title}...`}
                    />
                  </div>

                  {/* Group's Active Tasks — Pinterest Masonry Layout */}
                  {active.length === 0 && completed.length === 0 ? (
                    <div className="group-empty-state">
                      <span>No tasks in {list.title}</span>
                    </div>
                  ) : (
                    <>
                      {active.length > 0 ? (
                        <div className="masonry-grid">
                          {active.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              listName={list.title}
                              listColor={color}
                              subtasks={subtasksMap[task.id] ?? []}
                              subtaskCount={(subtasksMap[task.id] ?? []).length}
                              completedSubtaskCount={
                                (subtasksMap[task.id] ?? []).filter(
                                  (s) => s.status === "completed",
                                ).length
                              }
                              isSelected={selectedTaskId === task.id}
                              onSelectTask={onSelectTask}
                              onToggleComplete={onToggleComplete}
                              onToggleStar={onToggleStar}
                              onDeleteTask={onDeleteTask}
                            />
                          ))}
                        </div>
                      ) : null}

                      {/* Group's Completed Tasks */}
                      {completed.length > 0 ? (
                        <div className="group-completed-section">
                          <div className="group-completed-header">
                            <span>
                              Completed in {list.title} ({completed.length})
                            </span>
                            <button
                              type="button"
                              className="group-clear-btn"
                              onClick={() => onClearCompleted(list.id)}
                            >
                              Clear completed
                            </button>
                          </div>
                          <div className="masonry-grid masonry-grid--faded">
                            {completed.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                listName={list.title}
                                listColor={color}
                                subtasks={subtasksMap[task.id] ?? []}
                                subtaskCount={
                                  (subtasksMap[task.id] ?? []).length
                                }
                                completedSubtaskCount={
                                  (subtasksMap[task.id] ?? []).filter(
                                    (s) => s.status === "completed",
                                  ).length
                                }
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
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
