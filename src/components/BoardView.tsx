import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Task, TaskList } from "../types/tasks";
import { BoardColumn } from "./BoardColumn";

interface BoardViewProps {
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
  "#ffe600", // Yellow
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#f43f5e", // Coral
  "#f59e0b", // Amber
];

export function BoardView({
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
}: BoardViewProps) {
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    onAddList(newListName.trim());
    setNewListName("");
    setShowAddList(false);
  };

  return (
    <div className="board-view-container">
      <div className="board-columns-track">
        {taskLists.map((list, index) => {
          const listTasks = tasksByList[list.id] ?? [];
          const color = COLUMN_COLORS[index % COLUMN_COLORS.length];

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
            />
          );
        })}

        {/* Add New List Card at the end of the board */}
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
  );
}
