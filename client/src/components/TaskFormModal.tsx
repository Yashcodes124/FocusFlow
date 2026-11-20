import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Paperclip, X } from "lucide-react";
import {
  taskFormSchema,
  type TaskFormValues,
} from "../features/tasks/validation";
import type {
  Category,
  CreateTaskPayload,
  Tag,
  Task,
  TaskAttachment,
} from "../features/tasks/types";
import { taskService } from "../features/tasks/services/taskService";
import { formatDateInputValue } from "../utils/dates";
import {
  ATTACHMENT_ACCEPT,
  formatBytes,
  MAX_ATTACHMENTS_PER_TASK,
  readFileAsBase64,
  triggerBlobDownload,
  validateAttachmentFile,
} from "../utils/attachments";
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
  onSave: (
    payload: CreateTaskPayload,
    taskId?: string,
  ) => Promise<Task | void>;
  onAttachmentsChanged?: () => Promise<void> | void;
}

interface PendingAttachment {
  key: string;
  file: File;
}

export function TaskFormModal({
  open,
  onClose,
  task,
  categories,
  tags,
  onSave,
  onAttachmentsChanged,
}: TaskFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "Create task"}
      description={
        task
          ? "Update details, schedule, priority, or quick attachments."
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
          onAttachmentsChanged={onAttachmentsChanged}
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
  onAttachmentsChanged,
}: Omit<TaskFormModalProps, "open">) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => task?.tags.map((t) => t.id) ?? [],
  );
  const [existingAttachments, setExistingAttachments] = useState<
    TaskAttachment[]
  >(() => task?.attachments ?? []);
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);
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

  const totalAttachments =
    existingAttachments.length + pendingAttachments.length;
  const remainingSlots = Math.max(
    0,
    MAX_ATTACHMENTS_PER_TASK - totalAttachments,
  );

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (files.length > remainingSlots) {
      setAttachmentError(
        `You can attach up to ${MAX_ATTACHMENTS_PER_TASK} small files per task.`,
      );
    }

    const accepted: PendingAttachment[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const validationError = validateAttachmentFile(file);
      if (validationError) {
        setAttachmentError(validationError);
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
      });
    }

    if (accepted.length > 0) {
      setPendingAttachments((prev) => [...prev, ...accepted]);
    }
  };

  const handleRemoveExistingAttachment = async (attachment: TaskAttachment) => {
    if (!task) return;
    setAttachmentError(null);
    setRemovingAttachmentId(attachment.id);
    try {
      await taskService.deleteAttachment(task.id, attachment.id);
      setExistingAttachments((prev) =>
        prev.filter((item) => item.id !== attachment.id),
      );
      await onAttachmentsChanged?.();
    } catch (err) {
      setAttachmentError(
        extractApiErrorMessage(err, "Could not remove attachment."),
      );
    } finally {
      setRemovingAttachmentId(null);
    }
  };

  const handleDownloadExistingAttachment = async (
    attachment: TaskAttachment,
  ) => {
    if (!task) return;
    setAttachmentError(null);
    try {
      const blob = await taskService.downloadAttachment(task.id, attachment.id);
      triggerBlobDownload(blob, attachment.fileName);
    } catch (err) {
      setAttachmentError(
        extractApiErrorMessage(err, "Could not download attachment."),
      );
    }
  };

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitError(null);
    setAttachmentError(null);
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
      const savedTask = await onSave(
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

      const targetTaskId = savedTask?.id ?? task?.id;
      if (targetTaskId && pendingAttachments.length > 0) {
        for (const pending of pendingAttachments) {
          const dataBase64 = await readFileAsBase64(pending.file);
          await taskService.uploadAttachment(targetTaskId, {
            fileName: pending.file.name,
            mimeType: pending.file.type || "application/octet-stream",
            dataBase64,
          });
        }
        await onAttachmentsChanged?.();
      }

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
        autoFocus={!task}
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

      {/* Quick lightweight attachments (up to 2 files, <= 512 KB each) */}
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Quick attachments{" "}
              <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">
                ({totalAttachments}/{MAX_ATTACHMENTS_PER_TASK})
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Up to 2 small files (max 512 KB each: PNG, JPG, PDF, TXT, MD, CSV,
              JSON).
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple={remainingSlots > 1}
            onChange={handleFileSelection}
            aria-label="Choose quick attachment file"
            className="sr-only"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={remainingSlots === 0 || isSubmitting}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            Attach file
          </Button>
        </div>

        {attachmentError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {attachmentError}
          </p>
        )}

        {(existingAttachments.length > 0 || pendingAttachments.length > 0) && (
          <ul className="space-y-1.5 pt-1">
            {existingAttachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                  {att.fileName}{" "}
                  <span className="font-mono font-normal text-slate-400">
                    ({formatBytes(att.sizeBytes)})
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadExistingAttachment(att)}
                    aria-label={`Download ${att.fileName}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={removingAttachmentId === att.id}
                    onClick={() => handleRemoveExistingAttachment(att)}
                    aria-label={`Remove ${att.fileName}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
            {pendingAttachments.map((pending) => (
              <li
                key={pending.key}
                className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50/50 px-2.5 py-1.5 text-xs dark:border-blue-900/60 dark:bg-blue-950/30"
              >
                <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                  {pending.file.name}{" "}
                  <span className="font-mono font-normal text-slate-500 dark:text-slate-400">
                    ({formatBytes(pending.file.size)} · Ready)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPendingAttachments((prev) =>
                      prev.filter((item) => item.key !== pending.key),
                    )
                  }
                  aria-label={`Remove ${pending.file.name}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
