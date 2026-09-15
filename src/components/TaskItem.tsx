import {
  AlertCircle,
  Calendar,
  Check,
  CornerDownRight,
  FileText,
  Star,
  Trash2,
} from "lucide-react";
import type { Task } from "../types/tasks";

interface TaskItemProps {
  task: Task;
  subtasks?: Task[];
  isSelected: boolean;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleStar: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

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

function isDueToday(due?: string): boolean {
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = dateFromDue(due);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function isDueTomorrow(due?: string): boolean {
  if (!due) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const d = dateFromDue(due);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === tomorrow.getTime();
}

export function TaskItem({
  task,
  subtasks = [],
  isSelected,
  onSelectTask,
  onToggleComplete,
  onToggleStar,
  onDeleteTask,
}: TaskItemProps) {
  const isDone = task.status === "completed";
  const overdue = isOverdue(task);
  const today = isDueToday(task.due);
  const tomorrow = isDueTomorrow(task.due);

  const completedSubtasksCount = subtasks.filter(
    (s) => s.status === "completed",
  ).length;

  return (
    <article
      className={`task-item-card ${isDone ? "completed" : ""} ${isSelected ? "selected" : ""}`}
      onClick={() => onSelectTask(task)}
    >
      <div className="task-item-left">
        <button
          type="button"
          className={`task-circle-check ${isDone ? "done" : ""}`}
          aria-label={isDone ? "Mark as incomplete" : "Mark as completed"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
        >
          {isDone ? <Check size={14} strokeWidth={3} /> : null}
        </button>
      </div>

      <div className="task-item-content">
        <div className={`task-item-title ${isDone ? "strikethrough" : ""}`}>
          {task.title}
        </div>

        {task.notes ? (
          <div className="task-item-notes-preview">
            <FileText size={12} className="notes-icon" />
            <span className="notes-text">{task.notes}</span>
          </div>
        ) : null}

        <div className="task-item-meta-row">
          {task.due ? (
            <div className="task-due-badge-wrap">
              {overdue ? (
                <span className="badge-due overdue">
                  <AlertCircle size={11} /> OVERDUE · {formatDue(task.due)}
                </span>
              ) : today ? (
                <span className="badge-due today">
                  <Calendar size={11} /> DUE TODAY
                </span>
              ) : tomorrow ? (
                <span className="badge-due tomorrow">
                  <Calendar size={11} /> DUE TOMORROW
                </span>
              ) : (
                <span className="badge-due upcoming">
                  <Calendar size={11} /> {formatDue(task.due)}
                </span>
              )}
            </div>
          ) : null}

          {subtasks.length > 0 ? (
            <span className="badge-subtasks">
              <CornerDownRight size={11} />
              <span>
                {completedSubtasksCount}/{subtasks.length} subtasks
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="task-item-actions">
        <button
          type="button"
          className={`task-star-btn ${task.starred ? "starred" : ""}`}
          aria-label={task.starred ? "Unstar task" : "Star task"}
          title={task.starred ? "Starred" : "Star task"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(task.id);
          }}
        >
          <Star size={16} className={task.starred ? "star-active" : ""} />
        </button>

        <button
          type="button"
          className="task-delete-btn"
          aria-label={`Delete ${task.title}`}
          title="Delete task"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTask(task.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}
