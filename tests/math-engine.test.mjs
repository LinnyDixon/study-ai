import test from "node:test";
import assert from "node:assert/strict";
import { expressionValue, solveEquation, solveExpression, verifyNumericProcedure } from "../src/lib/math-engine.ts";

test("calculator evaluates precedence, fractions, powers, roots, percentages and logs with steps", () => {
  for (const [expression, expected] of [["2+3*4", 14], ["1/2+1/4", 0.75], ["2^5", 32], ["sqrt(81)", 9], ["25%*80", 20], ["log(100)", 2]]) {
    const result = solveExpression(expression);
    assert.ok(Math.abs(result.numericValue - expected) < 1e-9, expression);
    assert.ok(result.steps.length > 0, expression);
  }
});

test("calculator simplifies symbolic expressions and rejects divide by zero", () => {
  assert.match(solveExpression("2*x+3*x").result, /5/);
  assert.throws(() => solveExpression("4/0"), /finito|cero/iu);
  assert.equal(expressionValue("8"), 8);
  assert.equal(expressionValue("-2.5"), -2.5);
  assert.equal(verifyNumericProcedure("2+6=8"), true);
  assert.equal(verifyNumericProcedure("5+5=11"), false);
  assert.equal(verifyNumericProcedure("Sumé seis y dos"), null);
});

test("linear and quadratic equations solve and check realistic results", () => {
  assert.equal(solveEquation("2*x+3=11").solutions[0], "x = 4");
  const quadratic = solveEquation("x^2-5*x+6=0");
  assert.deepEqual(quadratic.solutions, ["x = 2", "x = 3"]);
  assert.ok(quadratic.steps.some((step) => step.includes("Comprobación")));
});

test("two-variable system and inequalities preserve the correct solution set", () => {
  assert.deepEqual(solveEquation("2*x+y=7\nx-y=2").solutions, ["x = 3", "y = 1"]);
  assert.deepEqual(solveEquation("-2*x+4<0", "inequality").solutions, ["x > 2", "Intervalo: (2, ∞)"]);
  assert.equal(expressionValue("sqrt(16)+1"), 5);
});
