import { CheckCircle2, Circle, Star, Calendar, GitBranch, Trash2 } from "lucide-react";
import type { Task } from "../types/tasks";

interface TaskCardProps {
  task: Task;
  listName: string;
  listColor: string;
  subtaskCount: number;
  completedSubtaskCount: number;
  isSelected: boolean;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleStar: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

function formatDue(due: string | undefined): string | null {
  if (!due) return null;
  try {
    const d = new Date(due);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

function isDueOverdue(due: string | undefined): boolean {
  if (!due) return false;
  try {
    const d = new Date(due);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()) < today;
  } catch {
    return false;
  }
}

export function TaskCard({
  task,
  listName,
  listColor,
  subtaskCount,
  completedSubtaskCount,
  isSelected,
  onSelectTask,
  onToggleComplete,
  onToggleStar,
  onDeleteTask,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const dueLabel = formatDue(task.due);
  const overdue = isDueOverdue(task.due) && !isCompleted;
  const hasNotes = Boolean(task.notes?.trim());

  return (
    <article
      className={`task-card${isSelected ? " task-card--selected" : ""}${isCompleted ? " task-card--completed" : ""}`}
      onClick={() => onSelectTask(task)}
    >
      {/* List color bar */}
      <div className="task-card-color-bar" style={{ background: listColor }} />

      {/* Card body */}
      <div className="task-card-body">
        {/* Top row: list tag + star */}
        <div className="task-card-meta-row">
          <span className="task-card-list-tag" style={{ borderColor: listColor, color: listColor }}>
            {listName}
          </span>
          <button
            type="button"
            className={`task-card-star-btn${task.starred ? " starred" : ""}`}
            aria-label={task.starred ? "Unstar task" : "Star task"}
            onClick={(e) => { e.stopPropagation(); onToggleStar(task.id); }}
          >
            <Star size={13} fill={task.starred ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Title */}
        <h3 className="task-card-title">{task.title}</h3>

        {/* Notes snippet */}
        {hasNotes ? (
          <p className="task-card-notes">{task.notes}</p>
        ) : null}

        {/* Bottom row: chips + actions */}
        <div className="task-card-footer">
          <div className="task-card-chips">
            {dueLabel ? (
              <span className={`task-card-chip${overdue ? " chip-overdue" : ""}`}>
                <Calendar size={10} />
                {dueLabel}
              </span>
            ) : null}
            {subtaskCount > 0 ? (
              <span className="task-card-chip">
                <GitBranch size={10} />
                {completedSubtaskCount}/{subtaskCount}
              </span>
            ) : null}
          </div>

          <div className="task-card-actions">
            <button
              type="button"
              className="task-card-action-btn"
              aria-label="Delete task"
              onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
            >
              <Trash2 size={12} />
            </button>
            <button
              type="button"
              className={`task-card-check-btn${isCompleted ? " completed" : ""}`}
              aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
              onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
            >
              {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
