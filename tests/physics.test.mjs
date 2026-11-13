import test from "node:test";
import assert from "node:assert/strict";
import { createPhysicsPracticeExercises, getFormula, inferPhysicsFormula, physicsTopics, simulatePhysics, solvePhysicsFormula, toSI } from "../src/lib/physics.ts";

test("physics catalog covers requested domains", () => {
  for (const topic of ["Cinemática", "Dinámica", "Leyes de Newton", "Trabajo y energía", "Potencia", "Cantidad de movimiento", "Gravitación", "Electricidad", "Óptica", "Ondas", "Termodinámica"]) assert.ok(physicsTopics.includes(topic), topic);
});

test("deterministic formulas return verified SI results", () => {
  assert.equal(solvePhysicsFormula("velocity", "v", { v0: 2, a: 3, t: 4 }), 14);
  assert.equal(solvePhysicsFormula("newton-second", "F", { m: 5, a: 2 }), 10);
  assert.equal(solvePhysicsFormula("ohm", "V", { I: 2, R: 5 }), 10);
  assert.equal(solvePhysicsFormula("wave-speed", "v", { f: 5, lambda: 2 }), 10);
  assert.ok(Math.abs(solvePhysicsFormula("snell", "theta2", { n1: 1, theta1: 30, n2: 1.33 }) - 22.082) < .01);
});

test("unit conversion and incomplete/invalid data fail safely", () => {
  assert.equal(toSI(36, "km/h", "m/s"), 10);
  assert.equal(toSI(5, "kg", "m"), null);
  assert.equal(solvePhysicsFormula("ohm", "I", { V: 12, R: 0 }), null);
  assert.equal(solvePhysicsFormula("unknown", "x", {}), null);
  assert.equal(getFormula("unknown"), null);
});

test("interactive simulation models use consistent equations and units", () => {
  const fall = simulatePhysics("free-fall", 2, 5, 10);
  assert.equal(fall.position, 19.62);
  assert.equal(fall.velocity, 19.62);
  assert.equal(simulatePhysics("uniform-motion", 3, 4, 10).position, 12);
  assert.ok(Math.abs(simulatePhysics("projectile", 1, 10, 45).position - (10 * Math.sin(Math.PI / 4) - 4.905)) < 1e-10);
  assert.equal(simulatePhysics("circuit", 0, 12, 6).position, 2);
  assert.ok(Math.abs(simulatePhysics("refraction", 0, 5, 30).position - 22.082) < .01);
  assert.equal(simulatePhysics("wave", .25, 2, 1).position, 2);
  assert.equal(simulatePhysics("friction", 2, 0, 1).position, 0);
});

test("clear physics questions map to a matching formula and target symbol", () => {
  assert.deepEqual(inferPhysicsFormula("Un objeto parte del reposo y acelera a 2 m/s² durante 5 s. ¿Cuál es su velocidad final?"), { formulaId: "velocity", target: "v" });
  assert.deepEqual(inferPhysicsFormula("Calcula la fuerza neta sobre una masa de 5 kg que acelera a 2 m/s²."), { formulaId: "newton-second", target: "F" });
  assert.equal(inferPhysicsFormula("¿Qué modelo se debe usar?"), null);
});

test("every topic can generate practice items with solvable, unit-compatible data", () => {
  for (const topic of physicsTopics) {
    const items = createPhysicsPracticeExercises(topic, "Intermedio", 4);
    assert.equal(items.length, 4);
    for (const item of items) {
      const formula = getFormula(item.formulaId);
      assert.equal(formula?.topic, topic);
      const known = Object.fromEntries(Object.entries(item.known).map(([symbol, entry]) => {
        const variable = formula.variables.find(candidate => candidate.symbol === symbol);
        assert.ok(variable);
        const converted = toSI(entry.value, entry.unit, variable.unit);
        assert.notEqual(converted, null);
        return [symbol, converted];
      }));
      assert.notEqual(solvePhysicsFormula(item.formulaId, item.target, known), null);
      assert.match(item.prompt, /Calcula/);
    }
  }
});



