import test from "node:test";
import assert from "node:assert/strict";
import { motivationQuotes, nextMotivationQuoteIndex } from "../src/lib/motivation-quotes.ts";

test("motivation phrase selection never repeats the previous index", () => {
  assert.equal(motivationQuotes.length >= 10, true);
  for (let previous = 0; previous < motivationQuotes.length; previous += 1) {
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      assert.notEqual(nextMotivationQuoteIndex(previous, () => random), previous);
    }
  }
  assert.ok(nextMotivationQuoteIndex(-1, () => 0) >= 0);
});
