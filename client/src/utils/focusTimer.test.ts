import test from "node:test";
import assert from "node:assert/strict";
import {
  computeElapsedSeconds,
  computeRemainingSeconds,
  createIdleTimerState,
  formatTimerClock,
  transitionPause,
  transitionStartOrResume,
} from "./focusTimer.ts";

test("focusTimer computes drift-free remaining and elapsed seconds across start, pause, resume, and completion", () => {
  const idle = createIdleTimerState("FOCUS", 25, "task-1", "Write specs");
  assert.equal(computeRemainingSeconds(idle, 1000), 1500);
  assert.equal(computeElapsedSeconds(idle, 1000), 0);

  // Start at t = 10_000ms
  const started = transitionStartOrResume(idle, "session-1", 10_000);
  // 5 minutes (300s) pass -> remaining = 1200s, elapsed = 300s
  assert.equal(computeRemainingSeconds(started, 310_000), 1200);
  assert.equal(computeElapsedSeconds(started, 310_000), 300);

  // Pause at t = 310_000ms
  const paused = transitionPause(started, 310_000);
  assert.equal(paused.running, false);
  // 10 minutes pass while paused -> remaining stays 1200s, elapsed stays 300s
  assert.equal(computeRemainingSeconds(paused, 910_000), 1200);
  assert.equal(computeElapsedSeconds(paused, 910_000), 300);

  // Resume at t = 910_000ms and advance 20 minutes (1200s)
  const resumed = transitionStartOrResume(paused, null, 910_000);
  assert.equal(computeRemainingSeconds(resumed, 2_110_000), 0);
  assert.equal(computeElapsedSeconds(resumed, 2_110_000), 1500);
});

test("formatTimerClock formats mm:ss with zero padding", () => {
  assert.equal(formatTimerClock(1500), "25:00");
  assert.equal(formatTimerClock(65), "01:05");
  assert.equal(formatTimerClock(0), "00:00");
});
