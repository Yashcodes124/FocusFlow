import React from "react";
import { AlertCircle } from "lucide-react";

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}
