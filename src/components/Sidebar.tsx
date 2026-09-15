import { useState } from "react";
import {
  Edit2,
  HelpCircle,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  Plus,
  Sparkles,
  Star,
  Sun,
  Trash2,
} from "lucide-react";
import type { SyncStatus, TaskList, UserProfile } from "../types/tasks";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  taskLists: TaskList[];
  selectedListId: string;
  onSelectList: (listId: string) => void;
  onAddList: (title: string) => void;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  starredCount: number;
  syncStatus: SyncStatus;
  onSync: () => void;
  user: UserProfile | null;
  isDemo: boolean;
  onSignIn: () => void;
  onStartDemo: () => void;
  onSignOut: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenShortcuts: () => void;
  onOpenSetupGuide: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  taskLists,
  selectedListId,
  onSelectList,
  onAddList,
  onRenameList,
  onDeleteList,
  starredCount,
  syncStatus,
  onSync,
  user,
  isDemo,
  onSignIn,
  onStartDemo,
  onSignOut,
  darkMode,
  onToggleDarkMode,
  onOpenShortcuts,
  onOpenSetupGuide,
}: SidebarProps) {
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    onAddList(newListName.trim());
    setNewListName("");
    setShowNewListInput(false);
  };

  const statusText =
    syncStatus === "syncing"
      ? "◌ SYNCING..."
      : syncStatus === "error"
        ? "! SYNC ERROR"
        : isDemo
          ? "● DEMO MODE"
          : "● SYNCED";

  return (
    <aside className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-header">
        <div className="brand-lockup">
          <span className="brand-block">TASKS RAMASCRIPT</span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Collapse sidebar"
          onClick={onClose}
          title="Collapse sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Task navigation">
        <button
          type="button"
          className={`nav-pill boards-nav-pill ${selectedListId === "all" ? "active" : ""}`}
          onClick={() => onSelectList("all")}
        >
          <LayoutDashboard size={16} />
          <span>All Boards</span>
        </button>
        <button
          type="button"
          className={`nav-pill star-nav-pill ${selectedListId === "starred" ? "active" : ""}`}
          onClick={() => onSelectList("starred")}
        >
          <Star
            size={16}
            className={selectedListId === "starred" ? "star-active" : ""}
          />
          <span>STARRED</span>
          <span className="nav-count star-count">{starredCount}</span>
        </button>
      </nav>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <p className="label">MY LISTS</p>
          <span className="microcopy-badge">{taskLists.length}</span>
        </div>

        <div className="list-stack">
          {taskLists.map((list) => {
            const isSelected = selectedListId === list.id;
            return (
              <div
                key={list.id}
                className={`list-row ${isSelected ? "selected" : ""}`}
              >
                <button
                  type="button"
                  className="list-name"
                  onClick={() => onSelectList(list.id)}
                  title={list.title}
                >
                  <span className="list-name-text">{list.title}</span>
                </button>
                <div className="list-actions">
                  <button
                    type="button"
                    className="mini-button-icon"
                    aria-label={`Rename ${list.title}`}
                    title="Rename list"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = window.prompt("Rename list", list.title);
                      if (next && next.trim()) {
                        onRenameList(list.id, next.trim());
                      }
                    }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    className="mini-button-icon danger"
                    aria-label={`Delete ${list.title}`}
                    title="Delete list"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete "${list.title}"? This cannot be undone.`,
                        )
                      ) {
                        onDeleteList(list.id);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showNewListInput ? (
          <div className="inline-create-box">
            <input
              type="text"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Name your list..."
              aria-label="New list name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateList();
                } else if (e.key === "Escape") {
                  setShowNewListInput(false);
                  setNewListName("");
                }
              }}
            />
            <div className="inline-create-actions">
              <button
                type="button"
                className="primary-button tiny"
                onClick={handleCreateList}
              >
                CREATE
              </button>
              <button
                type="button"
                className="secondary-button tiny"
                onClick={() => {
                  setShowNewListInput(false);
                  setNewListName("");
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="nav-pill create-button"
            onClick={() => setShowNewListInput(true)}
          >
            <Plus size={15} />
            <span>CREATE NEW LIST</span>
          </button>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sync-indicator ${syncStatus}`}
          onClick={onSync}
          title="Click to trigger two-way sync with Google Tasks"
        >
          {statusText}
        </button>

        <div className="account-card">
          {user?.picture ? (
            <img
              className="account-avatar"
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="account-avatar-placeholder">
              {(user?.name?.[0] || "G").toUpperCase()}
            </div>
          )}
          <div className="account-meta">
            <div className="account-name">{user?.name ?? (isDemo ? "Demo User" : "Logged In")}</div>
            <div className="account-email">
              {user?.email ?? (isDemo ? "demo@tasko.local" : "Google Account")}
            </div>
          </div>
        </div>

        <div className="sidebar-utility-row">
          <button
            type="button"
            className="utility-btn"
            onClick={onToggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            <span>{darkMode ? "LIGHT" : "DARK"}</span>
          </button>

          <button
            type="button"
            className="utility-btn"
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={15} />
            <span>KEYS</span>
          </button>

          <button
            type="button"
            className="utility-btn"
            onClick={onOpenSetupGuide}
            title="GCP Guide"
          >
            <HelpCircle size={15} />
            <span>GCP</span>
          </button>
        </div>

        {isDemo ? (
          <button
            type="button"
            className="primary-button tiny"
            onClick={onSignIn}
          >
            CONNECT GOOGLE
          </button>
        ) : (
          <button
            type="button"
            className="secondary-button tiny"
            onClick={onStartDemo}
          >
            <Sparkles size={13} /> SWITCH TO DEMO
          </button>
        )}

        <button
          type="button"
          className="ghost-button tiny"
          onClick={onSignOut}
        >
          <LogOut size={14} />
          <span>SIGN OUT</span>
        </button>
      </div>
    </aside>
  );
}
