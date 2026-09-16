import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Check,
  Plus,
  Star,
  X,
} from "lucide-react";

interface InlineTaskComposerProps {
  onAddTask: (
    title: string,
    extra?: { notes?: string; due?: string; starred?: boolean },
  ) => void;
  isStarredDefault?: boolean;
  autoListenKey?: boolean;
  placeholder?: string;
}

export function InlineTaskComposer({
  onAddTask,
  isStarredDefault = false,
  autoListenKey = false,
  placeholder = "Add a task",
}: InlineTaskComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [duePreset, setDuePreset] = useState<
    "none" | "today" | "tomorrow" | "next-week" | "custom"
  >("none");
  const [customDue, setCustomDue] = useState("");
  const [isStarred, setIsStarred] = useState(isStarredDefault);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) {
      titleInputRef.current?.focus();
    }
  }, [isExpanded]);

  // Expose focus trigger via window custom event or key listener
  useEffect(() => {
    if (!autoListenKey) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => titleInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [autoListenKey]);

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

  const handleSave = (keepOpen = false) => {
    if (!title.trim()) return;

    const due = computeDueDate();
    onAddTask(title.trim(), {
      notes: notes.trim() || undefined,
      due,
      starred: isStarred || isStarredDefault,
    });

    setTitle("");
    setNotes("");
    setShowNotes(false);
    setDuePreset("none");
    setCustomDue("");
    setIsStarred(isStarredDefault);

    if (keepOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 10);
    } else {
      setIsExpanded(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setNotes("");
    setShowNotes(false);
    setDuePreset("none");
    setCustomDue("");
    setIsStarred(isStarredDefault);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div
        className="composer-collapsed"
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(true);
          }
        }}
      >
        <span className="composer-plus-icon">
          <Plus size={18} />
        </span>
        <span className="composer-placeholder-text">{placeholder}</span>
        {autoListenKey ? (
          <span className="composer-shortcut-hint">Press &apos;N&apos;</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="composer-expanded-card">
      <div className="composer-title-row">
        <input
          ref={titleInputRef}
          type="text"
          className="composer-title-input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Rapid task entry: save and keep composer open for the next task
              handleSave(true);
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
        />
        <button
          type="button"
          className={`star-toggle-btn ${isStarred ? "starred" : ""}`}
          title={isStarred ? "Starred task" : "Star task"}
          onClick={() => setIsStarred((v) => !v)}
        >
          <Star size={16} className={isStarred ? "star-active" : ""} />
        </button>
      </div>

      {showNotes ? (
        <textarea
          className="composer-notes-input"
          placeholder="Details or notes..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSave(false);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setShowNotes(false);
            }
          }}
        />
      ) : null}

      <div className="composer-toolbar-row">
        <div className="composer-options-left">
          {!showNotes ? (
            <button
              type="button"
              className="chip mini"
              onClick={() => setShowNotes(true)}
            >
              + DETAILS
            </button>
          ) : null}

          {/* Quick Due Presets */}
          <div className="due-chips-wrap">
            <button
              type="button"
              className={`chip mini ${duePreset === "today" ? "active" : ""}`}
              onClick={() =>
                setDuePreset((v) => (v === "today" ? "none" : "today"))
              }
            >
              TODAY
            </button>
            <button
              type="button"
              className={`chip mini ${duePreset === "tomorrow" ? "active" : ""}`}
              onClick={() =>
                setDuePreset((v) => (v === "tomorrow" ? "none" : "tomorrow"))
              }
            >
              TOMORROW
            </button>
            <button
              type="button"
              className={`chip mini ${duePreset === "next-week" ? "active" : ""}`}
              onClick={() =>
                setDuePreset((v) => (v === "next-week" ? "none" : "next-week"))
              }
            >
              NEXT WEEK
            </button>
            <button
              type="button"
              className={`chip mini ${duePreset === "custom" ? "active" : ""}`}
              onClick={() =>
                setDuePreset((v) => (v === "custom" ? "none" : "custom"))
              }
            >
              <Calendar size={11} />
              <span>DATE</span>
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

        <div className="composer-options-right">
          <button
            type="button"
            className="ghost-button tiny"
            onClick={handleCancel}
          >
            <X size={13} />
            <span>CANCEL</span>
          </button>
          <button
            type="button"
            className="primary-button tiny"
            disabled={!title.trim()}
            onClick={() => handleSave(false)}
          >
            <Check size={13} />
            <span>SAVE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
