export type FocusMode = "FOCUS" | "SHORT_BREAK" | "LONG_BREAK";

export interface PersistedTimerState {
  sessionId: string | null;
  mode: FocusMode;
  plannedSeconds: number;
  remainingSecondsWhenPaused: number;
  running: boolean;
  /** Epoch ms when the current running interval will reach 0 */
  targetEndAt: number | null;
  /** Epoch ms when the session first started */
  sessionStartedAt: number | null;
  /** Accumulated focused seconds before current active run segment */
  accumulatedSeconds: number;
  /** Epoch ms when current active run segment started */
  segmentStartedAt: number | null;
  taskId: string | null;
  taskTitle: string | null;
}

const STORAGE_KEY = "focusflow_active_timer_v1";

export function createIdleTimerState(
  mode: FocusMode,
  plannedMinutes: number,
  taskId: string | null = null,
  taskTitle: string | null = null,
): PersistedTimerState {
  const plannedSeconds = Math.max(60, Math.round(plannedMinutes * 60));
  return {
    sessionId: null,
    mode,
    plannedSeconds,
    remainingSecondsWhenPaused: plannedSeconds,
    running: false,
    targetEndAt: null,
    sessionStartedAt: null,
    accumulatedSeconds: 0,
    segmentStartedAt: null,
    taskId,
    taskTitle,
  };
}

/**
 * Pure timestamp-based computation so browser tab throttling or page refreshes
 * never cause timer drift.
 */
export function computeRemainingSeconds(
  state: PersistedTimerState,
  nowMs = Date.now(),
): number {
  if (!state.running || state.targetEndAt === null) {
    return Math.max(0, Math.round(state.remainingSecondsWhenPaused));
  }
  const diffSeconds = Math.ceil((state.targetEndAt - nowMs) / 1000);
  return Math.max(0, diffSeconds);
}

export function computeElapsedSeconds(
  state: PersistedTimerState,
  nowMs = Date.now(),
): number {
  let elapsed = state.accumulatedSeconds;
  if (state.running && state.segmentStartedAt !== null) {
    elapsed += Math.max(0, Math.floor((nowMs - state.segmentStartedAt) / 1000));
  }
  return Math.min(state.plannedSeconds, elapsed);
}

export function transitionStartOrResume(
  state: PersistedTimerState,
  sessionId: string | null,
  nowMs = Date.now(),
): PersistedTimerState {
  const remaining = Math.max(1, state.remainingSecondsWhenPaused);
  return {
    ...state,
    sessionId: sessionId ?? state.sessionId,
    running: true,
    sessionStartedAt: state.sessionStartedAt ?? nowMs,
    segmentStartedAt: nowMs,
    targetEndAt: nowMs + remaining * 1000,
  };
}

export function transitionPause(
  state: PersistedTimerState,
  nowMs = Date.now(),
): PersistedTimerState {
  if (!state.running) return state;
  const remaining = computeRemainingSeconds(state, nowMs);
  const elapsed = computeElapsedSeconds(state, nowMs);
  return {
    ...state,
    running: false,
    remainingSecondsWhenPaused: remaining,
    targetEndAt: null,
    accumulatedSeconds: elapsed,
    segmentStartedAt: null,
  };
}

export function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function loadPersistedTimerState(): PersistedTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimerState;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.plannedSeconds !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedTimerState(state: PersistedTimerState | null): void {
  try {
    if (!state) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage write errors
  }
}
