import { useState, useRef, useEffect } from "react";
import {
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Edit2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import type { Task, TaskList } from "../types/tasks";
import { InlineTaskComposer } from "./InlineTaskComposer";
import { TaskCard } from "./TaskCard";

interface BoardColumnProps {
  list: TaskList;
  tasks: Task[];
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
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onClearCompleted: (listId: string) => void;
  accentColor?: string;
  index?: number;
}

export function BoardColumn({
  list,
  tasks,
  subtasksMap,
  selectedTaskId,
  onSelectTask,
  onAddTask,
  onToggleComplete,
  onToggleStar,
  onDeleteTask,
  onRenameList,
  onDeleteList,
  onClearCompleted,
  accentColor = "var(--accent)",
}: BoardColumnProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const topLevelTasks = tasks.filter((t) => !t.parent);
  const activeTasks = topLevelTasks.filter((t) => t.status === "needsAction");
  const completedTasks = topLevelTasks.filter((t) => t.status === "completed");

  return (
    <div className="board-column">
      {/* Column Header: Grouped by List */}
      <div className="board-column-header">
        <div className="board-column-title-wrap">
          <span
            className="column-color-indicator"
            style={{ backgroundColor: accentColor }}
          />
          <h2 className="board-column-title" title={list.title}>
            {list.title}
          </h2>
          <span className="column-count-badge">{activeTasks.length}</span>
        </div>

        <div className="dropdown-wrapper" ref={menuRef}>
          <button
            type="button"
            className="column-menu-btn"
            aria-label="Column options"
            onClick={() => setShowMenu((v) => !v)}
          >
            <MoreVertical size={16} />
          </button>

          {showMenu ? (
            <div className="dropdown-menu align-right">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowMenu(false);
                  const next = window.prompt("Rename list", list.title);
                  if (next && next.trim()) {
                    onRenameList(list.id, next.trim());
                  }
                }}
              >
                <Edit2 size={13} />
                <span>Rename List</span>
              </button>

              <button
                type="button"
                className="dropdown-item"
                disabled={completedTasks.length === 0}
                onClick={() => {
                  setShowMenu(false);
                  if (
                    window.confirm(
                      `Clear all ${completedTasks.length} completed task${completedTasks.length === 1 ? "" : "s"} in "${list.title}"?`,
                    )
                  ) {
                    onClearCompleted(list.id);
                  }
                }}
              >
                <CheckCheck size={13} />
                <span>Clear Completed ({completedTasks.length})</span>
              </button>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-item danger"
                onClick={() => {
                  setShowMenu(false);
                  if (
                    window.confirm(
                      `Delete list "${list.title}"? This cannot be undone.`,
                    )
                  ) {
                    onDeleteList(list.id);
                  }
                }}
              >
                <Trash2 size={13} />
                <span>Delete List</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Column Body: Pinterest-style variable-height cards */}
      <div className="board-column-body">
        {/* Quick inline "+ Add a task" composer */}
        <InlineTaskComposer
          onAddTask={(title, extra) => onAddTask(title, extra, list.id)}
          placeholder={`Add task to ${list.title}...`}
        />

        {/* Active Tasks Stack — variable heights, one after another */}
        <div className="column-task-list">
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="column-empty-state">
              <span>No tasks in this list</span>
              <p>Type above to add a task</p>
            </div>
          ) : null}

          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              listName={list.title}
              listColor={accentColor}
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

        {/* Completed Tasks Accordion */}
        {completedTasks.length > 0 ? (
          <div className="column-completed-section">
            <button
              type="button"
              className="column-completed-toggle"
              onClick={() => setShowCompleted((v) => !v)}
            >
              <span className="completed-arrow-icon">
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span>Completed ({completedTasks.length})</span>
            </button>

            {showCompleted ? (
              <div className="column-completed-cards">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    listName={list.title}
                    listColor={accentColor}
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
