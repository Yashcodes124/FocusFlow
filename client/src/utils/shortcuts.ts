export type WorkspaceRoute =
  | "/dashboard"
  | "/tasks"
  | "/habits"
  | "/focus"
  | "/notes"
  | "/settings";

export type ShortcutAction =
  | { type: "OPEN_NEW_TASK" }
  | { type: "FOCUS_SEARCH" }
  | { type: "OPEN_AI_DECOMPOSE" }
  | { type: "TOGGLE_THEME" }
  | { type: "TOGGLE_HELP" }
  | { type: "NAVIGATE"; to: WorkspaceRoute }
  | { type: "START_CHORD"; prefix: "g" }
  | null;

export interface ShortcutKeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface ShortcutMatchOptions {
  pendingChord: "g" | null;
  isEditable: boolean;
  modalOpen: boolean;
}

export interface ShortcutDefinition {
  keys: string[];
  altKeys?: string[];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  items: ShortcutDefinition[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Quick actions",
    items: [
      {
        keys: ["Ctrl", "N"],
        altKeys: ["N"],
        description: "Create a new task from anywhere",
      },
      {
        keys: ["Ctrl", "K"],
        altKeys: ["/"],
        description: "Search tasks by title or description",
      },
      {
        keys: ["Ctrl", "Shift", "A"],
        altKeys: ["Alt", "A"],
        description: "Open AI Task Decomposer",
      },
      {
        keys: ["Ctrl", "Shift", "D"],
        description: "Toggle light / dark mode",
      },
      {
        keys: ["?"],
        description: "Show or hide keyboard shortcuts",
      },
    ],
  },
  {
    title: "Navigation (press G, then key)",
    items: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "T"], description: "Go to Tasks" },
      { keys: ["G", "H"], description: "Go to Habits" },
      { keys: ["G", "F"], description: "Go to Focus Timer" },
      { keys: ["G", "N"], description: "Go to Notes" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
];

const CHORD_ROUTES: Record<string, WorkspaceRoute> = {
  d: "/dashboard",
  t: "/tasks",
  h: "/habits",
  f: "/focus",
  n: "/notes",
  s: "/settings",
};

export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => unknown;
  };
  const tag = el.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (el.isContentEditable) {
    return true;
  }
  if (typeof el.closest === "function") {
    return Boolean(el.closest('[contenteditable="true"]'));
  }
  return false;
}

export function matchGlobalShortcut(
  input: ShortcutKeyInput,
  options: ShortcutMatchOptions,
): ShortcutAction {
  const key = input.key.toLowerCase();
  const ctrlOrMeta = Boolean(input.ctrlKey || input.metaKey);
  const alt = Boolean(input.altKey);
  const shift = Boolean(input.shiftKey);

  // Help modal toggle works even when another shortcut modal is open if pressing "?" outside inputs
  if (!ctrlOrMeta && !alt && !options.isEditable && input.key === "?") {
    return { type: "TOGGLE_HELP" };
  }

  // Do not fire workspace shortcuts while a dialog/modal is open
  if (options.modalOpen) {
    return null;
  }

  // Modifier-based global shortcuts
  if (ctrlOrMeta && !alt && !shift && key === "n") {
    return { type: "OPEN_NEW_TASK" };
  }
  if (alt && !ctrlOrMeta && !shift && key === "n") {
    return { type: "OPEN_NEW_TASK" };
  }
  if (ctrlOrMeta && !alt && !shift && key === "k") {
    return { type: "FOCUS_SEARCH" };
  }
  if ((ctrlOrMeta && shift && !alt && key === "a") || (alt && !ctrlOrMeta && !shift && key === "a")) {
    return { type: "OPEN_AI_DECOMPOSE" };
  }
  if (ctrlOrMeta && shift && !alt && key === "d") {
    return { type: "TOGGLE_THEME" };
  }

  // Single-key and chord shortcuts only fire outside editable fields
  if (options.isEditable || ctrlOrMeta || alt) {
    return null;
  }

  if (options.pendingChord === "g") {
    const route = CHORD_ROUTES[key];
    return route ? { type: "NAVIGATE", to: route } : null;
  }

  if (!shift && key === "g") {
    return { type: "START_CHORD", prefix: "g" };
  }

  if (!shift && key === "n") {
    return { type: "OPEN_NEW_TASK" };
  }

  return null;
}

export const TASKS_CHANGED_EVENT = "focusflow:tasks-changed";

export function notifyTasksChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT));
  }
}
