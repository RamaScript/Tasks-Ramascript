import {
  Calendar,
  CheckCircle2,
  Circle,
  CornerDownRight,
  FileText,
  Trash2,
} from "lucide-react";
import type { Task } from "../types/tasks";

interface TaskCardProps {
  task: Task;
  listName?: string;
  listColor?: string;
  subtasks?: Task[];
  subtaskCount?: number;
  completedSubtaskCount?: number;
  isSelected: boolean;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleStar?: (taskId: string) => void;
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
  listColor = "var(--accent)",
  subtasks = [],
  subtaskCount = 0,
  completedSubtaskCount = 0,
  isSelected,
  onSelectTask,
  onToggleComplete,
  onDeleteTask,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const dueLabel = formatDue(task.due);
  const overdue = isDueOverdue(task.due) && !isCompleted;
  const hasNotes = Boolean(task.notes?.trim());
  const actualSubtaskCount = subtaskCount || subtasks.length;
  const actualCompletedSubs =
    completedSubtaskCount ||
    subtasks.filter((s) => s.status === "completed").length;

  return (
    <article
      className={`task-card${isSelected ? " task-card--selected" : ""}${isCompleted ? " task-card--completed" : ""}`}
      onClick={() => onSelectTask(task)}
    >
      {/* Top list-colored accent bar */}
      <div className="task-card-color-bar" style={{ background: listColor }} />

      <div className="task-card-body">
        {/* Title row: Radio checkbox just before task name (no group name, no star) */}
        <div className="task-card-title-row">
          <button
            type="button"
            className={`task-card-check-btn${isCompleted ? " completed" : ""}`}
            aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task);
            }}
            title={isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {isCompleted ? (
              <CheckCircle2 size={17} color="#10b981" />
            ) : (
              <Circle size={17} />
            )}
          </button>

          <h3 className="task-card-title">{task.title}</h3>
        </div>

        {/* Notes snippet — dynamic vertical height when notes exist */}
        {hasNotes ? (
          <div className="task-card-notes">
            <FileText size={11} className="task-card-notes-icon" />
            <span>{task.notes}</span>
          </div>
        ) : null}

        {/* Subtasks checklist preview — Pinterest dynamic height */}
        {subtasks.length > 0 ? (
          <div className="task-card-subtasks-preview">
            {subtasks.slice(0, 3).map((sub) => (
              <div
                key={sub.id}
                className={`card-subtask-item${sub.status === "completed" ? " done" : ""}`}
              >
                <CornerDownRight size={10} className="subtask-arrow" />
                <span className="subtask-text">{sub.title}</span>
              </div>
            ))}
            {subtasks.length > 3 ? (
              <span className="card-subtask-more">
                +{subtasks.length - 3} more subtask{subtasks.length - 3 !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Card Footer: Chips & Delete action */}
        <div className="task-card-footer">
          <div className="task-card-chips">
            {dueLabel ? (
              <span className={`task-card-chip${overdue ? " chip-overdue" : ""}`}>
                <Calendar size={10} />
                {dueLabel}
              </span>
            ) : null}
            {actualSubtaskCount > 0 ? (
              <span className="task-card-chip">
                {actualCompletedSubs}/{actualSubtaskCount}
              </span>
            ) : null}
          </div>

          <div className="task-card-actions">
            <button
              type="button"
              className="task-card-action-btn"
              aria-label="Delete task"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(task.id);
              }}
              title="Delete task"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
