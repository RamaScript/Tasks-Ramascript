import { useState, useRef, useEffect } from "react";
import { Calendar, Plus, Star, X } from "lucide-react";
import type { TaskList } from "../types/tasks";

interface QuickAddModalProps {
  taskLists: TaskList[];
  defaultListId: string;
  onClose: () => void;
  onAddTask: (
    title: string,
    extra?: { notes?: string; due?: string; starred?: boolean },
    targetList?: string,
  ) => void;
}

export function QuickAddModal({
  taskLists,
  defaultListId,
  onClose,
  onAddTask,
}: QuickAddModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedList, setSelectedList] = useState(() => {
    if (defaultListId && defaultListId !== "all" && defaultListId !== "starred") {
      return defaultListId;
    }
    return taskLists[0]?.id ?? "";
  });
  const [duePreset, setDuePreset] = useState<
    "none" | "today" | "tomorrow" | "next-week" | "custom"
  >("none");
  const [customDue, setCustomDue] = useState("");
  const [isStarred, setIsStarred] = useState(defaultListId === "starred");

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const computeDueDate = (): string | undefined => {
    const now = new Date();
    if (duePreset === "today") {
      return now.toISOString().split("T")[0];
    }
    if (duePreset === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }
    if (duePreset === "next-week") {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split("T")[0];
    }
    if (duePreset === "custom" && customDue) {
      return customDue;
    }
    return undefined;
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const due = computeDueDate();
    onAddTask(
      title.trim(),
      {
        notes: notes.trim() || undefined,
        due,
        starred: isStarred,
      },
      selectedList || undefined,
    );
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="quick-add-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
      >
        <div className="quick-add-header">
          <div className="quick-add-header-title">
            <Plus size={18} color="var(--accent)" />
            <h2 id="quick-add-title">Add a task</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="quick-add-body">
          {/* Target List Selector */}
          {taskLists.length > 0 ? (
            <div className="quick-add-field">
              <label htmlFor="quick-add-list" className="quick-add-label">
                List
              </label>
              <select
                id="quick-add-list"
                className="quick-add-select"
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
              >
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Title Input */}
          <div className="quick-add-field">
            <div className="quick-add-title-row">
              <input
                ref={titleInputRef}
                type="text"
                className="quick-add-title-input"
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
              <button
                type="button"
                className={`star-toggle-btn ${isStarred ? "starred" : ""}`}
                title={isStarred ? "Starred task" : "Star task"}
                onClick={() => setIsStarred((v) => !v)}
              >
                <Star size={18} className={isStarred ? "star-active" : ""} />
              </button>
            </div>
          </div>

          {/* Details / Notes */}
          <div className="quick-add-field">
            <textarea
              className="quick-add-notes-input"
              placeholder="Details, descriptions, links..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          {/* Due Date Presets */}
          <div className="quick-add-field">
            <label className="quick-add-label">Due Date</label>
            <div className="quick-add-due-row">
              <button
                type="button"
                className={`chip mini ${duePreset === "today" ? "active" : ""}`}
                onClick={() =>
                  setDuePreset((v) => (v === "today" ? "none" : "today"))
                }
              >
                Today
              </button>
              <button
                type="button"
                className={`chip mini ${duePreset === "tomorrow" ? "active" : ""}`}
                onClick={() =>
                  setDuePreset((v) => (v === "tomorrow" ? "none" : "tomorrow"))
                }
              >
                Tomorrow
              </button>
              <button
                type="button"
                className={`chip mini ${duePreset === "next-week" ? "active" : ""}`}
                onClick={() =>
                  setDuePreset((v) => (v === "next-week" ? "none" : "next-week"))
                }
              >
                Next week
              </button>
              <button
                type="button"
                className={`chip mini ${duePreset === "custom" ? "active" : ""}`}
                onClick={() =>
                  setDuePreset((v) => (v === "custom" ? "none" : "custom"))
                }
              >
                <Calendar size={11} />
                <span>Date</span>
              </button>

              {duePreset === "custom" ? (
                <input
                  type="date"
                  className="chip-date-picker"
                  value={customDue}
                  onChange={(e) => setCustomDue(e.target.value)}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="quick-add-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!title.trim()}
            onClick={handleSave}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
