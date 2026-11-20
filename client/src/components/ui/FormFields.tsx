import React, { useId } from "react";

interface BaseFieldProps {
  label: string;
  error?: string;
  helperText?: string;
}

type InputFieldProps = BaseFieldProps &
  React.InputHTMLAttributes<HTMLInputElement>;

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, error, helperText, id, className = "", ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`block min-h-[40px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
            error
              ? "border-red-500 dark:border-red-500"
              : "border-slate-300 dark:border-slate-700"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

type TextAreaFieldProps = BaseFieldProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextAreaField = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(function TextAreaField({ label, error, helperText, id, className = "", ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
          error
            ? "border-red-500 dark:border-red-500"
            : "border-slate-300 dark:border-slate-700"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

type SelectFieldProps = BaseFieldProps &
  React.SelectHTMLAttributes<HTMLSelectElement>;

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, helperText, id, className = "", children, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`block min-h-[40px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:bg-slate-900 dark:text-slate-100 ${
            error
              ? "border-red-500 dark:border-red-500"
              : "border-slate-300 dark:border-slate-700"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);
