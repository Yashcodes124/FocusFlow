import test from "node:test";
import assert from "node:assert/strict";
import {
  getDescriptionSnippet,
  matchesTaskSearch,
  splitHighlightSegments,
  tokenizeSearchQuery,
} from "./taskSearch";

test("tokenizeSearchQuery trims, lowercases, and splits multi-word input", () => {
  assert.deepEqual(tokenizeSearchQuery("  API   Webhooks  "), [
    "api",
    "webhooks",
  ]);
  assert.deepEqual(tokenizeSearchQuery("   "), []);
});

test("matchesTaskSearch matches title and description case-insensitively across multi-word queries", () => {
  const task = {
    title: "Prepare Q4 launch notes",
    description: "Verify Stripe billing webhooks and retry logic",
  };

  assert.equal(matchesTaskSearch(task, ""), true);
  assert.equal(matchesTaskSearch(task, "launch"), true);
  assert.equal(matchesTaskSearch(task, "WEBHOOKS"), true);
  assert.equal(matchesTaskSearch(task, "launch webhooks"), true);
  assert.equal(matchesTaskSearch(task, "launch nonexistent"), false);
  assert.equal(
    matchesTaskSearch({ title: "Solo title", description: null }, "solo"),
    true,
  );
  assert.equal(
    matchesTaskSearch({ title: "Solo title", description: null }, "missing"),
    false,
  );
});

test("splitHighlightSegments splits matched substrings safely including regex metacharacters", () => {
  const segments = splitHighlightSegments(
    "Upgrade API (v2) by 50%",
    "api 50%",
  );
  assert.deepEqual(segments, [
    { text: "Upgrade ", matched: false },
    { text: "API", matched: true },
    { text: " (v2) by ", matched: false },
    { text: "50%", matched: true },
  ]);
});

test("getDescriptionSnippet centers excerpt around late matches in long descriptions", () => {
  const longDesc = `${"Introductory context sentence. ".repeat(6)}Verify billing webhooks before shipping the release.`;
  const snippet = getDescriptionSnippet(longDesc, "webhooks", 90);
  assert.ok(snippet);
  assert.ok(snippet.includes("webhooks"));
  assert.ok(snippet.startsWith("…"));
});
