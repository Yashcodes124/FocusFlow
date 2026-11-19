import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "../features/auth/validation";
import { taskService } from "../features/tasks/services/taskService";
import type { Category, Tag } from "../features/tasks/types";
import { extractApiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { InputField, SelectField } from "../components/ui/FormFields";
import { ErrorBanner } from "../components/ui/States";

const SWATCHES = ["#2563EB", "#0D9488", "#16A34A", "#D97706", "#DC2626", "#475569"];

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Taxonomy state
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#2563EB");
  const [newTagName, setNewTagName] = useState("");
  const [taxonomyBusy, setTaxonomyBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues: {
      name: user?.name ?? "",
      timezone: user?.timezone ?? "UTC",
      theme: user?.theme ?? "light",
      focusDurationMinutes: user?.focusDurationMinutes ?? 25,
      shortBreakMinutes: user?.shortBreakMinutes ?? 5,
      longBreakMinutes: user?.longBreakMinutes ?? 15,
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      name: user.name,
      timezone: user.timezone,
      theme: user.theme,
      focusDurationMinutes: user.focusDurationMinutes,
      shortBreakMinutes: user.shortBreakMinutes,
      longBreakMinutes: user.longBreakMinutes,
    });
  }, [user, reset]);

  useEffect(() => {
    let active = true;
    Promise.all([taskService.listCategories(), taskService.listTags()])
      .then(([cats, tagList]) => {
        if (!active) return;
        setCategories(cats);
        setTags(tagList);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          extractApiErrorMessage(err, "Failed to load categories and tags."),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const onSaveProfile = async (values: ProfileFormValues) => {
    setError(null);
    setProfileSaved(false);
    try {
      await updateProfile({
        name: values.name,
        timezone: values.timezone,
        theme: values.theme,
        focusDurationMinutes: Number(values.focusDurationMinutes),
        shortBreakMinutes: Number(values.shortBreakMinutes),
        longBreakMinutes: Number(values.longBreakMinutes),
      });
      setProfileSaved(true);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update profile."));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setTaxonomyBusy(true);
    setError(null);
    try {
      const created = await taskService.createCategory(
        newCategoryName.trim(),
        newCategoryColor,
      );
      setCategories((prev) => [...prev, created]);
      setNewCategoryName("");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not create category."));
    } finally {
      setTaxonomyBusy(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setError(null);
    try {
      await taskService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not delete category."));
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTaxonomyBusy(true);
    setError(null);
    try {
      const created = await taskService.createTag(newTagName.trim(), "#475569");
      setTags((prev) => [...prev, created]);
      setNewTagName("");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not create tag."));
    } finally {
      setTaxonomyBusy(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    setError(null);
    try {
      await taskService.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not delete tag."));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your profile, default Pomodoro durations, and task organization.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {profileSaved && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Preferences saved.</span>
        </div>
      )}

      {/* Profile & Focus Defaults */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Profile &amp; focus preferences
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Signed in as {user?.email}
        </p>

        <form
          onSubmit={handleSubmit(onSaveProfile)}
          className="mt-5 space-y-5"
          noValidate
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Display name"
              error={errors.name?.message}
              {...register("name")}
            />

            <SelectField
              label="Appearance"
              error={errors.theme?.message}
              {...register("theme")}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </SelectField>
          </div>

          <InputField
            label="Timezone (IANA)"
            helperText="Used for accurate daily habit streaks and dashboard dates."
            error={errors.timezone?.message}
            {...register("timezone")}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField
              label="Focus length (min)"
              type="number"
              min={5}
              max={120}
              error={errors.focusDurationMinutes?.message}
              {...register("focusDurationMinutes")}
            />
            <InputField
              label="Short break (min)"
              type="number"
              min={1}
              max={30}
              error={errors.shortBreakMinutes?.message}
              {...register("shortBreakMinutes")}
            />
            <InputField
              label="Long break (min)"
              type="number"
              min={5}
              max={60}
              error={errors.longBreakMinutes?.message}
              {...register("longBreakMinutes")}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Save preferences
            </Button>
          </div>
        </form>
      </section>

      {/* Categories & Tags Management */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Categories
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Group tasks and notes by area of responsibility.
          </p>

          <form onSubmit={handleAddCategory} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <label htmlFor="new-category-input" className="sr-only">
                New category name
              </label>
              <input
                id="new-category-input"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Deep Work, Operations"
                className="min-h-[40px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <Button type="submit" size="md" loading={taxonomyBusy}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNewCategoryColor(hex)}
                  aria-label={`Category color ${hex}`}
                  className={`h-6 w-6 rounded-full ${
                    newCategoryColor === hex
                      ? "ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900"
                      : ""
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </form>

          <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {categories.length === 0 ? (
              <li className="py-4 text-xs text-slate-500 dark:text-slate-400">
                No categories created yet.
              </li>
            ) : (
              categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="inline-flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    aria-label={`Delete category "${cat.name}"`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Tags
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cross-cutting labels that can be attached to multiple tasks.
          </p>

          <form onSubmit={handleAddTag} className="mt-4 flex gap-2">
            <label htmlFor="new-tag-input" className="sr-only">
              New tag name
            </label>
            <input
              id="new-tag-input"
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g. Q4, blocked, review"
              className="min-h-[40px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <Button type="submit" size="md" loading={taxonomyBusy}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </Button>
          </form>

          <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {tags.length === 0 ? (
              <li className="py-4 text-xs text-slate-500 dark:text-slate-400">
                No tags created yet.
              </li>
            ) : (
              tags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    #{tag.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    aria-label={`Delete tag "${tag.name}"`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
