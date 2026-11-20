import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  FileText,
  Flame,
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

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/habits", label: "Habits", icon: Flame },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, theme, toggleTheme, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              `flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
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

        <div className="border-t border-slate-200 p-3 space-y-2 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
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
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
