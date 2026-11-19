import test from "node:test";
import assert from "node:assert/strict";
import {
  addDaysToDateKey,
  calculateHabitStreaks,
  formatLocalDate,
} from "../utils/streak.js";
import { extractActionItemsFromNote } from "../utils/noteExtractor.js";

test("calculateHabitStreaks computes consecutive days ending today", () => {
  const result = calculateHabitStreaks(
    ["2026-11-17", "2026-11-18", "2026-11-19"],
    "2026-11-19",
  );
  assert.equal(result.currentStreak, 3);
  assert.equal(result.bestStreak, 3);
  assert.equal(result.completedToday, true);
  assert.equal(result.lastCompletedDate, "2026-11-19");
  assert.equal(result.weeklyCompletedCount, 3);
  assert.equal(result.recent7Days.length, 7);
});

test("calculateHabitStreaks preserves active streak from yesterday when today not yet checked in", () => {
  const result = calculateHabitStreaks(
    ["2026-11-16", "2026-11-17", "2026-11-18"],
    "2026-11-19",
  );
  assert.equal(result.currentStreak, 3);
  assert.equal(result.bestStreak, 3);
  assert.equal(result.completedToday, false);
  assert.equal(result.lastCompletedDate, "2026-11-18");
});

test("calculateHabitStreaks resets currentStreak to 0 after a missed day while keeping bestStreak", () => {
  const result = calculateHabitStreaks(
    ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-17"],
    "2026-11-19",
  );
  assert.equal(result.currentStreak, 0);
  assert.equal(result.bestStreak, 4);
  assert.equal(result.completedToday, false);
});

test("calculateHabitStreaks deduplicates duplicate check-ins and ignores future dates", () => {
  const result = calculateHabitStreaks(
    ["2026-11-18", "2026-11-18", "2026-11-19", "2026-11-19", "2026-11-25"],
    "2026-11-19",
  );
  assert.equal(result.currentStreak, 2);
  assert.equal(result.bestStreak, 2);
  assert.equal(result.completedToday, true);
  assert.equal(result.lastCompletedDate, "2026-11-19");
});

test("addDaysToDateKey and formatLocalDate handle month boundaries and timezones", () => {
  assert.equal(addDaysToDateKey("2026-03-01", -1), "2026-02-28");
  const utcMidnight = new Date("2026-11-19T02:00:00.000Z");
  assert.equal(formatLocalDate(utcMidnight, "UTC"), "2026-11-19");
  assert.equal(formatLocalDate(utcMidnight, "America/Los_Angeles"), "2026-11-18");
});

test("extractActionItemsFromNote extracts unchecked boxes and TODO/ACTION prefixes without duplicates", () => {
  const note = [
    "# Weekly Sync",
    "- [ ] Finalize API contract urgently",
    "- [x] Already completed item",
    "TODO: Review focus timer state persistence",
    "ACTION: Clean up optional CSS later",
    "- [ ] Finalize API contract urgently",
    "Regular note paragraph without action syntax.",
  ].join("\n");

  const items = extractActionItemsFromNote(note);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], {
    title: "Finalize API contract urgently",
    priority: "HIGH",
  });
  assert.deepEqual(items[1], {
    title: "Review focus timer state persistence",
    priority: "MEDIUM",
  });
  assert.deepEqual(items[2], {
    title: "Clean up optional CSS later",
    priority: "LOW",
  });
});
