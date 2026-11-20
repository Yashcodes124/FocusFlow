import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ListPlus,
  Pin,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  noteService,
  type Note,
} from "../features/notes/services/noteService";
import { taskService } from "../features/tasks/services/taskService";
import type { Category } from "../features/tasks/types";
import { extractApiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorBanner } from "../components/ui/States";

const ACTION_LINE_RE =
  /^\s*(?:[-*+]\s*)?(?:\[\s\]\s+|(?:TODO|ACTION|TASK|FOLLOW[\s-]?UP)\s*:\s*)(.+)$/i;

function countDetectedActionLines(content: string): number {
  return content
    .split(/\r?\n/)
    .filter((line) => ACTION_LINE_RE.test(line)).length;
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Editor state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const applySelectedNote = useCallback((note: Note | null) => {
    setSelectedId(note?.id ?? null);
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setCategoryId(note?.categoryId ?? "");
  }, []);

  const loadNotes = useCallback(async () => {
    setError(null);
    try {
      const [noteRows, cats] = await Promise.all([
        noteService.list({ search: search.trim() || undefined }),
        taskService.listCategories(),
      ]);
      setNotes(noteRows);
      setCategories(cats);
      setSelectedId((prev) => {
        const current =
          (prev && noteRows.find((n) => n.id === prev)) || noteRows[0] || null;
        if (!prev || !noteRows.some((n) => n.id === prev)) {
          setTitle(current?.title ?? "");
          setContent(current?.content ?? "");
          setCategoryId(current?.categoryId ?? "");
        }
        return current?.id ?? null;
      });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load notes."));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => loadNotes(), 150);
    return () => window.clearTimeout(t);
  }, [loadNotes]);

  const handleCreateNote = async () => {
    setError(null);
    setNotice(null);
    try {
      const created = await noteService.create({
        title: "Untitled note",
        content: "- [ ] ",
      });
      setNotes((prev) => [created, ...prev]);
      applySelectedNote(created);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not create note."));
    }
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    if (!title.trim()) {
      setError("Note title cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await noteService.update(selectedNote.id, {
        title: title.trim(),
        content,
        categoryId: categoryId || null,
      });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setNotice("Note saved.");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not save note."));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const updated = await noteService.update(note.id, {
        isPinned: !note.isPinned,
      });
      setNotes((prev) =>
        prev
          .map((n) => (n.id === updated.id ? updated : n))
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
      );
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update pin state."));
    }
  };

  const handleDelete = async (note: Note) => {
    setError(null);
    setNotice(null);
    try {
      await noteService.remove(note.id);
      setNotes((prev) => {
        const remaining = prev.filter((n) => n.id !== note.id);
        if (selectedId === note.id) {
          applySelectedNote(remaining[0] ?? null);
        }
        return remaining;
      });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not delete note."));
    }
  };

  const handleExtractTasks = async () => {
    if (!selectedNote) return;
    setExtracting(true);
    setError(null);
    setNotice(null);
    try {
      // Save latest editor changes first so extraction uses up-to-date content
      await noteService.update(selectedNote.id, {
        title: title.trim() || selectedNote.title,
        content,
        categoryId: categoryId || null,
      });
      const result = await noteService.extractTasks(selectedNote.id, {
        categoryId: categoryId || null,
      });
      if (result.extractedCount > 0) {
        setNotice(
          `Created ${result.extractedCount} task${result.extractedCount === 1 ? "" : "s"} in your Tasks list.`,
        );
      } else {
        setNotice(
          'No action lines found. Prefix lines with "- [ ] " or "TODO: " to extract them as tasks.',
        );
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not extract tasks."));
    } finally {
      setExtracting(false);
    }
  };

  const detectedCount = countDetectedActionLines(content);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Notes
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Capture meeting notes and turn <code className="font-mono text-xs">- [ ]</code> or{" "}
            <code className="font-mono text-xs">TODO:</code> lines into tasks.
          </p>
        </div>

        <Button onClick={handleCreateNote}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New note
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadNotes} />}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar List */}
        <div className="space-y-3 lg:col-span-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="notes-search" className="sr-only">
              Search notes
            </label>
            <input
              id="notes-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Loading notes…
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Create a note to capture ideas, meeting summaries, or project plans."
              action={
                <Button size="sm" onClick={handleCreateNote}>
                  Create first note
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {notes.map((note) => {
                const active = note.id === selectedId;
                return (
                  <div
                    key={note.id}
                    className={`flex items-start justify-between gap-2 px-3.5 py-3 transition-colors ${
                      active
                        ? "bg-blue-50/70 dark:bg-blue-950/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        applySelectedNote(note);
                        setNotice(null);
                      }}
                      className="min-w-0 flex-1 text-left focus-visible:outline-none"
                    >
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {note.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {note.content.trim() || "Empty note"}
                      </p>
                      <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                        {new Date(note.updatedAt).toLocaleDateString()}
                        {note.category ? ` · ${note.category.name}` : ""}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePin(note)}
                      aria-label={
                        note.isPinned
                          ? `Unpin "${note.title}"`
                          : `Pin "${note.title}"`
                      }
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                        note.isPinned
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-8">
          {selectedNote ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="note-title-input" className="sr-only">
                  Note title
                </label>
                <input
                  id="note-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="flex-1 bg-transparent text-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                />

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Note category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <Button size="sm" loading={saving} onClick={handleSave}>
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    Save
                  </Button>
                </div>
              </div>

              <label htmlFor="note-content-input" className="sr-only">
                Note content
              </label>
              <textarea
                id="note-content-input"
                rows={13}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  "Write notes here…\n\nTip: Lines starting with \"- [ ] \" or \"TODO: \" can be extracted straight into Tasks."
                }
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-sans text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={extracting}
                  onClick={handleExtractTasks}
                >
                  <ListPlus className="h-4 w-4" aria-hidden="true" />
                  Extract tasks{" "}
                  {detectedCount > 0 ? `(${detectedCount} detected)` : ""}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedNote)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete note
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Select or create a note"
              description="Choose a note from the list or start a new one to write and extract tasks."
            />
          )}
        </div>
      </div>
    </div>
  );
}
