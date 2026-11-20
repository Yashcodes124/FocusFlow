import { Modal } from "./ui/Modal";
import { SHORTCUT_GROUPS } from "../utils/shortcuts";

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, idx) => (
        <span key={`${key}-${idx}`} className="inline-flex items-center gap-1">
          {idx > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {keys[0] === "G" ? "then" : "+"}
            </span>
          )}
          <kbd className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Navigate FocusFlow and capture work without leaving the keyboard."
    >
      <div className="space-y-5">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {group.title}
            </h3>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/50">
              {group.items.map((item) => (
                <div
                  key={item.description}
                  className="flex items-center justify-between gap-4 px-3.5 py-2.5"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {item.description}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <KeyCombo keys={item.keys} />
                    {item.altKeys && (
                      <>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          or
                        </span>
                        <KeyCombo keys={item.altKeys} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tip: Single-key shortcuts (<kbd className="font-mono">N</kbd>,{" "}
          <kbd className="font-mono">G</kbd>, <kbd className="font-mono">?</kbd>)
          automatically pause while you are typing inside a form field. Press{" "}
          <kbd className="font-mono">Esc</kbd> to close any modal.
        </p>
      </div>
    </Modal>
  );
}
