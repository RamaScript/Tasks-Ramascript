import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Check,
  CornerDownRight,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { Task, TaskList } from "../types/tasks";
import { toInputDateFormat } from "../services/googleTasks";

interface TaskDetailDrawerProps {
  task: Task | null;
  subtasks?: Task[];
  taskLists: TaskList[];
  selectedListId: string;
  onClose: () => void;
  onSave: (
    taskId: string,
    draft: { title: string; notes: string; due: string },
  ) => void;
  onDelete: (taskId: string) => void;
  onMoveToList: (taskId: string, targetListId: string) => void;
  onToggleStatus: (task: Task) => void;
  onToggleStar: (taskId: string) => void;
  onAddSubtask: (parentTaskId: string, title: string) => void;
}

export function TaskDetailDrawer({
  task,
  subtasks = [],
  taskLists,
  selectedListId,
  onClose,
  onSave,
  onDelete,
  onMoveToList,
  onToggleStatus,
  onToggleStar,
  onAddSubtask,
}: TaskDetailDrawerProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDue, setDraftDue] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  const subtaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      // oxlint-disable-next-line react/set-state-in-effect -- sync draft state when active task updates
      setDraftTitle(task.title);
      // oxlint-disable-next-line react/set-state-in-effect -- sync draft state when active task updates
      setDraftNotes(task.notes ?? "");
      // oxlint-disable-next-line react/set-state-in-effect -- sync draft state when active task updates
      setDraftDue(toInputDateFormat(task.due));
    }
  }, [task]);

  useEffect(() => {
    if (showSubtaskInput) {
      subtaskInputRef.current?.focus();
    }
  }, [showSubtaskInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!task) return null;

  const isDone = task.status === "completed";

  const handleBlurOrSave = () => {
    if (!task) return;
    const cleanTitle = draftTitle.trim() || task.title;
    onSave(task.id, {
      title: cleanTitle,
      notes: draftNotes.trim(),
      due: draftDue,
    });
  };

  const handleAddSubtaskSubmit = () => {
    if (!newSubtaskTitle.trim() || !task) return;
    onAddSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle("");
    setTimeout(() => subtaskInputRef.current?.focus(), 20);
  };

  const setDuePreset = (preset: "today" | "tomorrow" | "next-week" | "clear") => {
    const now = new Date();
    if (preset === "clear") {
      setDraftDue("");
      onSave(task.id, {
        title: draftTitle.trim() || task.title,
        notes: draftNotes.trim(),
        due: "",
      });
      return;
    }
    let target = new Date(now);
    if (preset === "tomorrow") {
      target.setDate(target.getDate() + 1);
    } else if (preset === "next-week") {
      target.setDate(target.getDate() + 7);
    }
    const formatted = target.toISOString().split("T")[0];
    setDraftDue(formatted);
    onSave(task.id, {
      title: draftTitle.trim() || task.title,
      notes: draftNotes.trim(),
      due: formatted,
    });
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />

      <aside className="task-detail-drawer" aria-label="Task Inspector">
        <div className="drawer-header">
          <div className="drawer-header-left">
            <button
              type="button"
              className={`drawer-check-circle ${isDone ? "done" : ""}`}
              onClick={() => onToggleStatus(task)}
              title={isDone ? "Mark active" : "Mark completed"}
            >
              {isDone ? <Check size={14} strokeWidth={3} /> : null}
            </button>
            <span className="drawer-eyebrow">
              {isDone ? "COMPLETED TASK" : "ACTIVE TASK"}
            </span>
          </div>

          <div className="drawer-header-actions">
            <button
              type="button"
              className={`icon-button ${task.starred ? "starred" : ""}`}
              onClick={() => onToggleStar(task.id)}
              title={task.starred ? "Starred" : "Star task"}
            >
              <Star size={16} className={task.starred ? "star-active" : ""} />
            </button>

            <button
              type="button"
              className="icon-button danger"
              onClick={() => {
                if (window.confirm("Delete this task?")) {
                  onDelete(task.id);
                  onClose();
                }
              }}
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              title="Close drawer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {/* Title input */}
          <div className="drawer-field-group">
            <label htmlFor="drawer-title" className="drawer-label">
              TASK TITLE
            </label>
            <input
              id="drawer-title"
              type="text"
              className="drawer-title-input"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={handleBlurOrSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleBlurOrSave();
                }
              }}
            />
          </div>

          {/* Move to list selector */}
          <div className="drawer-field-group">
            <label htmlFor="drawer-list-select" className="drawer-label">
              TASK LIST
            </label>
            <select
              id="drawer-list-select"
              className="drawer-select"
              value={task.listId || selectedListId}
              onChange={(e) => {
                const targetId = e.target.value;
                if (targetId && targetId !== (task.listId || selectedListId)) {
                  onMoveToList(task.id, targetId);
                }
              }}
            >
              {taskLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Details / Notes input */}
          <div className="drawer-field-group">
            <label htmlFor="drawer-notes" className="drawer-label">
              DETAILS & NOTES
            </label>
            <textarea
              id="drawer-notes"
              className="drawer-notes-textarea"
              rows={5}
              placeholder="Add descriptions, markdown links, checklist items..."
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              onBlur={handleBlurOrSave}
            />
          </div>

          {/* Due Date picker with quick presets */}
          <div className="drawer-field-group">
            <div className="drawer-label-row">
              <label htmlFor="drawer-date" className="drawer-label">
                DUE DATE
              </label>
              {draftDue ? (
                <button
                  type="button"
                  className="mini-text-btn"
                  onClick={() => setDuePreset("clear")}
                >
                  CLEAR DATE
                </button>
              ) : null}
            </div>

            <div className="drawer-date-presets">
              <button
                type="button"
                className="chip mini"
                onClick={() => setDuePreset("today")}
              >
                TODAY
              </button>
              <button
                type="button"
                className="chip mini"
                onClick={() => setDuePreset("tomorrow")}
              >
                TOMORROW
              </button>
              <button
                type="button"
                className="chip mini"
                onClick={() => setDuePreset("next-week")}
              >
                NEXT WEEK
              </button>
            </div>

            <div className="drawer-date-input-wrap">
              <Calendar size={14} />
              <input
                id="drawer-date"
                type="date"
                className="drawer-date-input"
                value={draftDue}
                onChange={(e) => {
                  setDraftDue(e.target.value);
                  onSave(task.id, {
                    title: draftTitle.trim() || task.title,
                    notes: draftNotes.trim(),
                    due: e.target.value,
                  });
                }}
              />
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="drawer-field-group subtasks-group">
            <div className="drawer-label-row">
              <label className="drawer-label">SUBTASKS ({subtasks.length})</label>
              {!showSubtaskInput ? (
                <button
                  type="button"
                  className="mini-text-btn"
                  onClick={() => setShowSubtaskInput(true)}
                >
                  + ADD SUBTASK
                </button>
              ) : null}
            </div>

            {subtasks.length > 0 ? (
              <div className="subtask-list">
                {subtasks.map((sub) => {
                  const subDone = sub.status === "completed";
                  return (
                    <div key={sub.id} className="subtask-row">
                      <button
                        type="button"
                        className={`subtask-check ${subDone ? "done" : ""}`}
                        onClick={() => onToggleStatus(sub)}
                      >
                        {subDone ? <Check size={11} strokeWidth={3} /> : null}
                      </button>
                      <span
                        className={`subtask-title ${subDone ? "strikethrough" : ""}`}
                      >
                        {sub.title}
                      </span>
                      <button
                        type="button"
                        className="subtask-delete-btn"
                        onClick={() => onDelete(sub.id)}
                        title="Delete subtask"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {showSubtaskInput ? (
              <div className="inline-subtask-input-box">
                <CornerDownRight size={14} className="subtask-indent-icon" />
                <input
                  ref={subtaskInputRef}
                  type="text"
                  placeholder="Subtask title... (Press Enter)"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtaskSubmit();
                    } else if (e.key === "Escape") {
                      setShowSubtaskInput(false);
                      setNewSubtaskTitle("");
                    }
                  }}
                />
                <button
                  type="button"
                  className="mini-button"
                  onClick={handleAddSubtaskSubmit}
                >
                  ADD
                </button>
                <button
                  type="button"
                  className="mini-button-icon"
                  onClick={() => {
                    setShowSubtaskInput(false);
                    setNewSubtaskTitle("");
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="add-subtask-btn"
                onClick={() => setShowSubtaskInput(true)}
              >
                <Plus size={14} />
                <span>Add subtask</span>
              </button>
            )}
          </div>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="secondary-button tiny"
            onClick={onClose}
          >
            CLOSE
          </button>
          <button
            type="button"
            className="primary-button tiny"
            onClick={() => {
              handleBlurOrSave();
              onClose();
            }}
          >
            SAVE & CLOSE
          </button>
        </div>
      </aside>
    </>
  );
}
