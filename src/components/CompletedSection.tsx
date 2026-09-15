import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { Task } from "../types/tasks";
import { TaskItem } from "./TaskItem";

interface CompletedSectionProps {
  completedTasks: Task[];
  subtasksMap?: Record<string, Task[]>;
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleStar: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

export function CompletedSection({
  completedTasks,
  subtasksMap = {},
  selectedTaskId,
  onSelectTask,
  onToggleComplete,
  onToggleStar,
  onDeleteTask,
  onClearCompleted,
}: CompletedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (completedTasks.length === 0) {
    return null;
  }

  return (
    <section className="completed-accordion-section">
      <div className="completed-accordion-header">
        <button
          type="button"
          className="completed-toggle-btn"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
        >
          <span className="completed-toggle-arrow">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="completed-toggle-title">
            COMPLETED ({completedTasks.length})
          </span>
        </button>

        <button
          type="button"
          className="secondary-button tiny danger-text"
          onClick={() => {
            if (
              window.confirm(
                `Clear all ${completedTasks.length} completed task${completedTasks.length === 1 ? "" : "s"}?`,
              )
            ) {
              onClearCompleted();
            }
          }}
          title="Clear all completed tasks"
        >
          <Trash2 size={12} />
          <span>CLEAR ALL</span>
        </button>
      </div>

      {isExpanded ? (
        <div className="completed-task-list">
          {completedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              subtasks={subtasksMap[task.id] ?? []}
              isSelected={selectedTaskId === task.id}
              onSelectTask={onSelectTask}
              onToggleComplete={onToggleComplete}
              onToggleStar={onToggleStar}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
