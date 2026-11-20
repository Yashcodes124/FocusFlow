import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  FileText,
  Flame,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Timer,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { taskService } from "../../features/tasks/services/taskService";
import type {
  Category,
  CreateTaskPayload,
  Tag,
  Task,
} from "../../features/tasks/types";
import {
  isEditableElement,
  matchGlobalShortcut,
  notifyTasksChanged,
} from "../../utils/shortcuts";
import { TaskFormModal } from "../TaskFormModal";
import { ShortcutsHelpModal } from "../ShortcutsHelpModal";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, chord: "D" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, chord: "T" },
  { to: "/habits", label: "Habits", icon: Flame, chord: "H" },
  { to: "/focus", label: "Focus", icon: Timer, chord: "F" },
  { to: "/notes", label: "Notes", icon: FileText, chord: "N" },
  { to: "/settings", label: "Settings", icon: Settings, chord: "S" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, theme, toggleTheme, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global shortcut modals
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [chordPending, setChordPending] = useState(false);

  const pendingChordRef = useRef<"g" | null>(null);
  const chordTimerRef = useRef<number | null>(null);

  const openQuickTaskModal = useCallback(() => {
    setQuickTaskOpen(true);
    Promise.all([taskService.listCategories(), taskService.listTags()])
      .then(([cats, tagList]) => {
        setCategories(cats);
        setTags(tagList);
      })
      .catch(() => {
        // Non-fatal taxonomy load failure
      });
  }, []);

  const clearPendingChord = useCallback(() => {
    pendingChordRef.current = null;
    setChordPending(false);
    if (chordTimerRef.current !== null) {
      window.clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const anyDialogOpen =
        quickTaskOpen ||
        shortcutsOpen ||
        Boolean(document.querySelector('[role="dialog"]'));

      const action = matchGlobalShortcut(
        {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
        },
        {
          pendingChord: pendingChordRef.current,
          isEditable: isEditableElement(event.target),
          modalOpen: anyDialogOpen,
        },
      );

      if (!action) {
        if (pendingChordRef.current && event.key.length === 1) {
          clearPendingChord();
        }
        return;
      }

      if (action.type === "START_CHORD") {
        pendingChordRef.current = action.prefix;
        setChordPending(true);
        if (chordTimerRef.current !== null) {
          window.clearTimeout(chordTimerRef.current);
        }
        chordTimerRef.current = window.setTimeout(() => {
          pendingChordRef.current = null;
          chordTimerRef.current = null;
          setChordPending(false);
        }, 850);
        return;
      }

      clearPendingChord();
      event.preventDefault();

      switch (action.type) {
        case "OPEN_NEW_TASK":
          openQuickTaskModal();
          break;
        case "FOCUS_SEARCH": {
          const searchEl = document.getElementById(
            "task-search",
          ) as HTMLInputElement | null;
          if (location.pathname === "/tasks" && searchEl) {
            searchEl.focus();
            searchEl.select();
          } else {
            navigate("/tasks?focusSearch=1");
          }
          break;
        }
        case "OPEN_AI_DECOMPOSE":
          if (location.pathname === "/tasks") {
            window.dispatchEvent(new CustomEvent("focusflow:open-ai-decompose"));
          } else {
            navigate("/tasks?aiDecompose=1");
          }
          break;
        case "TOGGLE_THEME":
          void toggleTheme();
          break;
        case "TOGGLE_HELP":
          setShortcutsOpen((prev) => !prev);
          break;
        case "NAVIGATE":
          if (location.pathname !== action.to) {
            navigate(action.to);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPendingChord();
    };
  }, [
    clearPendingChord,
    location.pathname,
    navigate,
    openQuickTaskModal,
    quickTaskOpen,
    shortcutsOpen,
    toggleTheme,
  ]);

  const handleGlobalCreateTask = async (
    payload: CreateTaskPayload,
  ): Promise<Task> => {
    const created = await taskService.create(payload);
    notifyTasksChanged();
    return created;
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav aria-label="Main navigation" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex min-h-[40px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </span>
            <kbd
              aria-hidden="true"
              className={`hidden rounded px-1 py-0.5 font-mono text-[10px] transition-colors lg:inline ${
                chordPending
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                  : "text-slate-400 opacity-75 group-hover:opacity-100 dark:text-slate-500"
              }`}
            >
              G {item.chord}
            </kbd>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex h-16 items-center px-5 border-b border-slate-200 dark:border-slate-800">
          <NavLink
            to="/dashboard"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            FocusFlow
          </NavLink>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderNavLinks()}
        </div>

        <div className="border-t border-slate-200 p-3 space-y-1.5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span className="flex items-center gap-3">
              <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Shortcuts</span>
            </span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              ?
            </kbd>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span className="flex items-center gap-3">
              {theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              Ctrl⇧D
            </kbd>
          </button>

          <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {user?.name}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header (compact 56px, well under 15% mobile sticky cap) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <NavLink
            to="/dashboard"
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap dark:text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            FocusFlow
          </NavLink>
        </div>

        <NavLink
          to="/focus"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Timer className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>Focus</span>
        </NavLink>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-900">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span
                className="text-base font-bold tracking-tight text-slate-900 dark:text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                FocusFlow
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {renderNavLinks(() => setMobileMenuOpen(false))}
            </div>

            <div className="border-t border-slate-200 p-3 space-y-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShortcutsOpen(true);
                }}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Keyboard className="h-4 w-4" aria-hidden="true" />
                <span>Keyboard shortcuts</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign out ({user?.name})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex min-h-screen flex-col lg:pl-60">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex-1">{children}</div>

          {/* Subtle always-visible keyboard shortcut tip (desktop) */}
          <footer
            aria-label="Keyboard shortcut tips"
            className="mt-10 hidden items-center justify-between gap-4 border-t border-slate-200/70 pt-3.5 text-xs text-slate-400 lg:flex dark:border-slate-800/70 dark:text-slate-500"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={openQuickTaskModal}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  N
                </kbd>
                <span>New task</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const searchEl = document.getElementById(
                    "task-search",
                  ) as HTMLInputElement | null;
                  if (location.pathname === "/tasks" && searchEl) {
                    searchEl.focus();
                    searchEl.select();
                  } else {
                    navigate("/tasks?focusSearch=1");
                  }
                }}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Ctrl+K
                </kbd>
                <span>Search tasks</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (location.pathname === "/tasks") {
                    window.dispatchEvent(
                      new CustomEvent("focusflow:open-ai-decompose"),
                    );
                  } else {
                    navigate("/tasks?aiDecompose=1");
                  }
                }}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Alt+A
                </kbd>
                <span>AI breakdown</span>
              </button>
              <span
                className={`inline-flex items-center gap-1.5 transition-colors ${
                  chordPending ? "font-medium text-blue-600 dark:text-blue-400" : ""
                }`}
              >
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  G
                </kbd>
                <span>
                  {chordPending
                    ? "Press D, T, H, F, N, or S…"
                    : "+ key to jump pages"}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
            >
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                ?
              </kbd>
              <span>All shortcuts</span>
            </button>
          </footer>
        </div>
      </main>

      {/* Global Quick Task Creation Modal (Ctrl+N / N) */}
      <TaskFormModal
        open={quickTaskOpen}
        onClose={() => setQuickTaskOpen(false)}
        categories={categories}
        tags={tags}
        onSave={handleGlobalCreateTask}
        onAttachmentsChanged={notifyTasksChanged}
      />

      {/* Keyboard Shortcuts Reference Modal (?) */}
      <ShortcutsHelpModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
