import test from "node:test";
import assert from "node:assert/strict";
import { isEditableElement, matchGlobalShortcut } from "./shortcuts";

test("matchGlobalShortcut triggers task creation for Ctrl+N, Alt+N, and bare N outside inputs", () => {
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "n", ctrlKey: true },
      { pendingChord: null, isEditable: false, modalOpen: false },
    ),
    { type: "OPEN_NEW_TASK" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "N", altKey: true },
      { pendingChord: null, isEditable: false, modalOpen: false },
    ),
    { type: "OPEN_NEW_TASK" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "n" },
      { pendingChord: null, isEditable: false, modalOpen: false },
    ),
    { type: "OPEN_NEW_TASK" },
  );
  assert.equal(
    matchGlobalShortcut(
      { key: "n" },
      { pendingChord: null, isEditable: true, modalOpen: false },
    ),
    null,
  );
  assert.equal(
    matchGlobalShortcut(
      { key: "n", ctrlKey: true },
      { pendingChord: null, isEditable: false, modalOpen: true },
    ),
    null,
  );
});

test("matchGlobalShortcut resolves G navigation chords across all workspace pages", () => {
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "g" },
      { pendingChord: null, isEditable: false, modalOpen: false },
    ),
    { type: "START_CHORD", prefix: "g" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "t" },
      { pendingChord: "g", isEditable: false, modalOpen: false },
    ),
    { type: "NAVIGATE", to: "/tasks" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "d" },
      { pendingChord: "g", isEditable: false, modalOpen: false },
    ),
    { type: "NAVIGATE", to: "/dashboard" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "f" },
      { pendingChord: "g", isEditable: false, modalOpen: false },
    ),
    { type: "NAVIGATE", to: "/focus" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "s" },
      { pendingChord: "g", isEditable: false, modalOpen: false },
    ),
    { type: "NAVIGATE", to: "/settings" },
  );
  assert.equal(
    matchGlobalShortcut(
      { key: "x" },
      { pendingChord: "g", isEditable: false, modalOpen: false },
    ),
    null,
  );
});

test("matchGlobalShortcut handles search, AI decomposer, theme toggle, and help shortcuts", () => {
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "k", ctrlKey: true },
      { pendingChord: null, isEditable: true, modalOpen: false },
    ),
    { type: "FOCUS_SEARCH" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "A", ctrlKey: true, shiftKey: true },
      { pendingChord: null, isEditable: false, modalOpen: false },
    ),
    { type: "OPEN_AI_DECOMPOSE" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "D", ctrlKey: true, shiftKey: true },
      { pendingChord: null, isEditable: false, modalOpen: false },
    ),
    { type: "TOGGLE_THEME" },
  );
  assert.deepEqual(
    matchGlobalShortcut(
      { key: "?", shiftKey: true },
      { pendingChord: null, isEditable: false, modalOpen: true },
    ),
    { type: "TOGGLE_HELP" },
  );
});

test("isEditableElement detects inputs, textareas, selects, and contenteditable nodes", () => {
  assert.equal(isEditableElement({ tagName: "INPUT" } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: "TEXTAREA" } as unknown as EventTarget), true);
  assert.equal(isEditableElement({ tagName: "SELECT" } as unknown as EventTarget), true);
  assert.equal(
    isEditableElement({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget),
    true,
  );
  assert.equal(
    isEditableElement({ tagName: "BUTTON", isContentEditable: false } as unknown as EventTarget),
    false,
  );
});
