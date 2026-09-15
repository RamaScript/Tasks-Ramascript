import { X } from "lucide-react";

interface ShortcutsModalProps {
  onClose: () => void;
}

const shortcutRows: Array<{ keys: string; label: string }> = [
  { keys: "N", label: "Add a task (rapid entry)" },
  { keys: "/", label: "Search tasks" },
  { keys: "J / K", label: "Navigate tasks" },
  { keys: "C", label: "Toggle complete on focused task" },
  { keys: "S", label: "Toggle star on focused task" },
  { keys: "ENTER", label: "Save task / Next rapid entry" },
  { keys: "ESC", label: "Close detail drawer / Modals" },
  { keys: "?", label: "Show keyboard shortcuts cheatsheet" },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div
      className="shortcut-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="shortcut-box" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-header">
          <span>KEYBOARD SHORTCUTS</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close shortcuts modal"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="shortcut-list">
          {shortcutRows.map(({ keys, label }) => (
            <div key={keys} className="shortcut-row">
              <span className="keycap">{keys}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
