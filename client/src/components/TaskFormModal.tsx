import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  taskFormSchema,
  type TaskFormValues,
} from "../features/tasks/validation";
import type {
  Category,
  CreateTaskPayload,
  Tag,
  Task,
} from "../features/tasks/types";
import { formatDateInputValue } from "../utils/dates";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { InputField, SelectField, TextAreaField } from "./ui/FormFields";
import { ErrorBanner } from "./ui/States";
import { extractApiErrorMessage } from "../lib/api";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  categories: Category[];
  tags: Tag[];
  onSave: (payload: CreateTaskPayload, taskId?: string) => Promise<void>;
}

export function TaskFormModal({
  open,
  onClose,
  task,
  categories,
  tags,
  onSave,
}: TaskFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "Create task"}
      description={
        task
          ? "Update details, schedule, or priority."
          : "Capture a concrete action item you can execute."
      }
    >
      {open ? (
        <TaskFormBody
          key={task?.id ?? "new-task"}
          onClose={onClose}
          task={task}
          categories={categories}
          tags={tags}
          onSave={onSave}
        />
      ) : null}
    </Modal>
  );
}

function TaskFormBody({
  onClose,
  task,
  categories,
  tags,
  onSave,
}: Omit<TaskFormModalProps, "open">) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => task?.tags.map((t) => t.id) ?? [],
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? "",
          priority: task.priority,
          status: task.status,
          dueDate: formatDateInputValue(task.dueDate),
          categoryId: task.categoryId ?? "",
          estimatedMinutes: task.estimatedMinutes
            ? String(task.estimatedMinutes)
            : "",
          isImportant: task.isImportant,
        }
      : {
          title: "",
          description: "",
          priority: "MEDIUM",
          status: "TODO",
          dueDate: "",
          categoryId: "",
          estimatedMinutes: "",
          isImportant: false,
        },
  });

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitError(null);
    const parsedMinutes =
      values.estimatedMinutes && values.estimatedMinutes.trim() !== ""
        ? Number.parseInt(values.estimatedMinutes, 10)
        : null;

    if (
      parsedMinutes !== null &&
      (Number.isNaN(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 1440)
    ) {
      setSubmitError("Estimated minutes must be between 1 and 1440.");
      return;
    }

    try {
      await onSave(
        {
          title: values.title.trim(),
          description: values.description?.trim() || null,
          priority: values.priority,
          status: values.status,
          dueDate: values.dueDate ? values.dueDate : null,
          categoryId: values.categoryId || null,
          estimatedMinutes: parsedMinutes,
          isImportant: Boolean(values.isImportant),
          tagIds: selectedTagIds,
        },
        task?.id,
      );
      onClose();
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error, "Could not save task."));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {submitError && <ErrorBanner message={submitError} />}

        <InputField
          label="Title"
          placeholder="Draft Q4 roadmap milestones"
          error={errors.title?.message}
          {...register("title")}
        />

        <TextAreaField
          label="Description"
          rows={3}
          placeholder="Add context, acceptance criteria, or notes…"
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Priority"
            error={errors.priority?.message}
            {...register("priority")}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </SelectField>

          <SelectField
            label="Status"
            error={errors.status?.message}
            {...register("status")}
          >
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </SelectField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Due date"
            type="date"
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />

          <InputField
            label="Estimated minutes"
            type="number"
            min={1}
            max={1440}
            placeholder="e.g. 25"
            error={errors.estimatedMinutes?.message}
            {...register("estimatedMinutes")}
          />
        </div>

        <SelectField
          label="Category"
          error={errors.categoryId?.message}
          {...register("categoryId")}
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </SelectField>

        {tags.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Tags
            </legend>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={active}
                    className={`min-h-[34px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <label className="flex items-center gap-2.5 pt-1 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            {...register("isImportant")}
          />
          <span>Mark as important</span>
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
  );
}
