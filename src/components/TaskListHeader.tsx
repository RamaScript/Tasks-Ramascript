import { useState, useRef, useEffect } from "react";
import {
  ArrowUpDown,
  CheckCheck,
  Edit3,
  MoreVertical,
  PanelLeftOpen,
  Trash2,
} from "lucide-react";
import type { SortMode, TaskList } from "../types/tasks";

interface TaskListHeaderProps {
  selectedList: TaskList | null;
  isStarredView: boolean;
  activeCount: number;
  completedCount: number;
  sortMode: SortMode;
  onSelectSortMode: (mode: SortMode) => void;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onClearCompleted: () => void;
}

export function TaskListHeader({
  selectedList,
  isStarredView,
  activeCount,
  completedCount,
  sortMode,
  onSelectSortMode,
  sidebarOpen,
  onOpenSidebar,
  onRenameList,
  onDeleteList,
  onClearCompleted,
}: TaskListHeaderProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const title = isStarredView ? "STARRED TASKS" : selectedList?.title ?? "TASKS";

  const sortLabels: Record<SortMode, string> = {
    "my-order": "MY ORDER",
    date: "BY DATE",
    title: "BY TITLE (A-Z)",
    starred: "STARRED FIRST",
  };

  return (
    <header className="list-header">
      <div className="list-header-left">
        {!sidebarOpen ? (
          <button
            type="button"
            className="icon-button"
            aria-label="Open sidebar"
            onClick={onOpenSidebar}
            title="Expand sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        ) : null}

        <div className="list-title-lockup">
          <div className="list-title-row">
            <h1>{title}</h1>
            <span className="task-count-pill">
              {activeCount} ACTIVE
            </span>
          </div>
          <p className="eyebrow">
            {isStarredView ? "SMART FILTER VIEW" : "GOOGLE TASKS BOARD"}
          </p>
        </div>
      </div>

      <div className="list-header-right">
        {/* Sort Menu Dropdown */}
        <div className="dropdown-wrapper" ref={sortMenuRef}>
          <button
            type="button"
            className={`secondary-button tiny dropdown-trigger ${showSortMenu ? "active" : ""}`}
            onClick={() => {
              setShowSortMenu((v) => !v);
              setShowMoreMenu(false);
            }}
            title="Sort tasks"
          >
            <ArrowUpDown size={14} />
            <span className="dropdown-label">{sortLabels[sortMode]}</span>
          </button>

          {showSortMenu ? (
            <div className="dropdown-menu">
              <div className="dropdown-menu-header">SORT BY</div>
              <button
                type="button"
                className={`dropdown-item ${sortMode === "my-order" ? "selected" : ""}`}
                onClick={() => {
                  onSelectSortMode("my-order");
                  setShowSortMenu(false);
                }}
              >
                MY ORDER
              </button>
              <button
                type="button"
                className={`dropdown-item ${sortMode === "date" ? "selected" : ""}`}
                onClick={() => {
                  onSelectSortMode("date");
                  setShowSortMenu(false);
                }}
              >
                DATE (OVERDUE FIRST)
              </button>
              <button
                type="button"
                className={`dropdown-item ${sortMode === "title" ? "selected" : ""}`}
                onClick={() => {
                  onSelectSortMode("title");
                  setShowSortMenu(false);
                }}
              >
                TITLE (A-Z)
              </button>
              <button
                type="button"
                className={`dropdown-item ${sortMode === "starred" ? "selected" : ""}`}
                onClick={() => {
                  onSelectSortMode("starred");
                  setShowSortMenu(false);
                }}
              >
                STARRED FIRST
              </button>
            </div>
          ) : null}
        </div>

        {/* More Actions Menu */}
        <div className="dropdown-wrapper" ref={moreMenuRef}>
          <button
            type="button"
            className={`icon-button ${showMoreMenu ? "active" : ""}`}
            aria-label="List options"
            title="List options"
            onClick={() => {
              setShowMoreMenu((v) => !v);
              setShowSortMenu(false);
            }}
          >
            <MoreVertical size={16} />
          </button>

          {showMoreMenu ? (
            <div className="dropdown-menu align-right">
              {!isStarredView && selectedList ? (
                <>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowMoreMenu(false);
                      const next = window.prompt("Rename list", selectedList.title);
                      if (next && next.trim()) {
                        onRenameList(selectedList.id, next.trim());
                      }
                    }}
                  >
                    <Edit3 size={13} />
                    <span>RENAME LIST</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item danger"
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (
                        window.confirm(
                          `Delete "${selectedList.title}"? This cannot be undone.`,
                        )
                      ) {
                        onDeleteList(selectedList.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                    <span>DELETE LIST</span>
                  </button>
                  <div className="dropdown-divider" />
                </>
              ) : null}

              <button
                type="button"
                className="dropdown-item"
                disabled={completedCount === 0}
                onClick={() => {
                  setShowMoreMenu(false);
                  if (
                    window.confirm(
                      `Clear all ${completedCount} completed task${completedCount === 1 ? "" : "s"}?`,
                    )
                  ) {
                    onClearCompleted();
                  }
                }}
              >
                <CheckCheck size={13} />
                <span>CLEAR ALL COMPLETED ({completedCount})</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
