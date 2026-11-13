import test from "node:test";
import assert from "node:assert/strict";
import { periodicElements } from "../src/app/app/periodic-elements.ts";

test("periodic table contains all 118 elements", () => {
  assert.equal(periodicElements.length, 118);
  assert.equal(periodicElements[0].symbol, "H");
  assert.equal(periodicElements[117].symbol, "Og");
});

test("every element has a unique valid grid position", () => {
  const positions = periodicElements.map((element) => `${element.period}:${element.group}`);
  assert.equal(new Set(positions).size, 118);
  assert.ok(periodicElements.every((element) => element.period >= 1 && element.period <= 9 && element.group >= 1 && element.group <= 18));
});

test("elements include properties needed by the detail panel", () => {
  const iron = periodicElements.find((element) => element.symbol === "Fe");
  assert.ok(iron);
  assert.equal(iron.name, "Hierro");
  assert.equal(iron.atomicWeight, "55.84");
  assert.equal(iron.electronegativity, "1.83");
  assert.equal(iron.yearDiscovered, "Ancient");
});
