import test from "node:test";
import assert from "node:assert/strict";
import { calculatePeriodEnd } from "../src/lib/billing/period.ts";

test("monthly access ends one calendar month later, clamping month end", () => {
  assert.equal(calculatePeriodEnd(new Date("2026-01-31T12:00:00.000Z"), "monthly").toISOString(), "2026-02-28T23:59:59.999Z");
});

test("annual access lasts 12 months, not 14", () => {
  assert.equal(calculatePeriodEnd(new Date("2026-11-13T12:00:00.000Z"), "annual").toISOString(), "2027-11-13T23:59:59.999Z");
});

test("annual access handles leap day", () => {
  assert.equal(calculatePeriodEnd(new Date("2024-02-29T12:00:00.000Z"), "annual").toISOString(), "2025-02-28T23:59:59.999Z");
});
