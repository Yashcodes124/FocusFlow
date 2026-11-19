import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Flame, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { habitService } from "../features/habits/services/habitService";
import type { Habit } from "../features/habits/types";
import {
  habitFormSchema,
  type HabitFormValues,
} from "../features/habits/validation";
import { extractApiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import {
  InputField,
  SelectField,
  TextAreaField,
} from "../components/ui/FormFields";
import { EmptyState, ErrorBanner, LoadingRows } from "../components/ui/States";

const HABIT_COLORS = [
  "#2563EB",
  "#0D9488",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#475569",
];

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(habitFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      frequency: "DAILY",
      target: 1,
      color: "#2563EB",
    },
  });

  const selectedColor = useWatch({ control, name: "color" });

  const loadHabits = useCallback(async () => {
    setError(null);
    try {
      const data = await habitService.list();
      setHabits(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Failed to load habits."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    habitService
      .list()
      .then((data) => {
        if (!active) return;
        setHabits(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(extractApiErrorMessage(err, "Failed to load habits."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingHabit(null);
    setFormError(null);
    reset({
      name: "",
      description: "",
      frequency: "DAILY",
      target: 1,
      color: "#2563EB",
    });
    setModalOpen(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setFormError(null);
    reset({
      name: habit.name,
      description: habit.description ?? "",
      frequency: habit.frequency,
      target: habit.target,
      color: habit.color,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: HabitFormValues) => {
    setFormError(null);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        frequency: values.frequency,
        target: Number(values.target),
        color: values.color,
      };
      if (editingHabit) {
        const updated = await habitService.update(editingHabit.id, payload);
        setHabits((prev) =>
          prev.map((h) => (h.id === editingHabit.id ? updated : h)),
        );
      } else {
        const created = await habitService.create(payload);
        setHabits((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(extractApiErrorMessage(err, "Could not save habit."));
    }
  };

  const handleToggleDate = async (
    habit: Habit,
    date: string,
    currentlyCompleted: boolean,
  ) => {
    const key = `${habit.id}:${date}`;
    setBusyKey(key);
    setError(null);
    try {
      const updated = await habitService.checkIn(habit.id, {
        date,
        completed: !currentlyCompleted,
      });
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update check-in."));
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (habit: Habit) => {
    setBusyKey(habit.id);
    try {
      await habitService.remove(habit.id);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not delete habit."));
    } finally {
      setBusyKey(null);
    }
  };

  const completedTodayCount = habits.filter((h) => h.completedToday).length;
  const longestStreak = habits.reduce(
    (max, h) => Math.max(max, h.bestStreak),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Habits
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">
              {completedTodayCount}/{habits.length}
            </span>{" "}
            completed today · Longest streak:{" "}
            <span className="font-mono tabular-nums">{longestStreak}d</span>
          </p>
        </div>

        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New habit
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadHabits} />}

      {loading ? (
        <LoadingRows count={4} />
      ) : habits.length === 0 ? (
        <EmptyState
          title="Build your first daily habit"
          description="Track consistent routines with honest day-by-day check-ins and automatic streak tracking."
          action={
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create habit
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {habits.map((habit) => {
            const todayEntry = habit.recent7Days[habit.recent7Days.length - 1];
            const todayKey = todayEntry?.date ?? "";
            const weeklyPct = Math.round((habit.weeklyCompletedCount / 7) * 100);

            return (
              <div
                key={habit.id}
                className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* Left: Check-in CTA + Name + Meta */}
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <button
                    type="button"
                    disabled={busyKey === `${habit.id}:${todayKey}`}
                    onClick={() =>
                      todayKey &&
                      handleToggleDate(habit, todayKey, habit.completedToday)
                    }
                    aria-label={
                      habit.completedToday
                        ? `Uncheck "${habit.name}" for today`
                        : `Check in "${habit.name}" for today`
                    }
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      habit.completedToday
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white hover:border-blue-600 dark:border-slate-600 dark:bg-slate-900"
                    }`}
                  >
                    {habit.completedToday && (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: habit.color }}
                        aria-hidden="true"
                      />
                      <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {habit.name}
                      </h2>
                    </div>

                    {habit.description && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {habit.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        <Flame
                          className={`h-3.5 w-3.5 ${
                            habit.currentStreak > 0
                              ? "text-amber-500"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                          aria-hidden="true"
                        />
                        {habit.currentStreak}d current
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Trophy
                          className="h-3.5 w-3.5 text-slate-400"
                          aria-hidden="true"
                        />
                        {habit.bestStreak}d best
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {habit.weeklyCompletedCount}/7 this week ({weeklyPct}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: 7-Day Interactive History Grid + Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pl-9 lg:justify-end lg:pl-0">
                  <div
                    className="flex items-center gap-1.5"
                    role="group"
                    aria-label={`Last 7 days history for ${habit.name}`}
                  >
                    {habit.recent7Days.map((day) => {
                      const label = new Intl.DateTimeFormat(undefined, {
                        weekday: "narrow",
                        timeZone: "UTC",
                      }).format(new Date(`${day.date}T12:00:00.000Z`));
                      const cellBusy = busyKey === `${habit.id}:${day.date}`;

                      return (
                        <button
                          key={day.date}
                          type="button"
                          disabled={cellBusy}
                          onClick={() =>
                            handleToggleDate(habit, day.date, day.completed)
                          }
                          title={`${day.date}: ${day.completed ? "Completed" : "Missed"}`}
                          aria-label={`${habit.name} on ${day.date}: ${day.completed ? "completed" : "not completed"}`}
                          aria-pressed={day.completed}
                          className={`flex h-9 w-8 flex-col items-center justify-center rounded-md border text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                            day.completed
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(habit)}
                      aria-label={`Edit habit "${habit.name}"`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === habit.id}
                      onClick={() => handleDelete(habit)}
                      aria-label={`Delete habit "${habit.name}"`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Habit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingHabit ? "Edit habit" : "Create habit"}
        description="Define a clear, repeatable daily or weekly commitment."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError && <ErrorBanner message={formError} />}

          <InputField
            label="Habit name"
            placeholder="Morning deep work review"
            error={errors.name?.message}
            {...register("name")}
          />

          <TextAreaField
            label="Description"
            rows={2}
            placeholder="Optional cue or minimum daily standard…"
            error={errors.description?.message}
            {...register("description")}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Frequency"
              error={errors.frequency?.message}
              {...register("frequency")}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </SelectField>

            <InputField
              label="Target per cycle"
              type="number"
              min={1}
              max={31}
              error={errors.target?.message}
              {...register("target")}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Indicator color
            </legend>
            <div className="flex items-center gap-2.5">
              {HABIT_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setValue("color", hex)}
                  aria-label={`Select color ${hex}`}
                  aria-pressed={selectedColor === hex}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    selectedColor === hex
                      ? "ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingHabit ? "Save changes" : "Create habit"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
