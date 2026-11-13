import test from "node:test";
import assert from "node:assert/strict";
import { balanceChemicalEquation, molarMass, parseChemicalFormula, chemistryMolecules } from "../src/lib/chemistry.ts";

test("formula parser counts subscripts and nested groups", () => {
  assert.deepEqual(parseChemicalFormula("Ca(OH)2"), { Ca: 1, O: 2, H: 2 });
  assert.equal(molarMass("H2O") > 18 && molarMass("H2O") < 18.1, true);
});

test("equation balancing conserves atoms and finds minimum integer coefficients", () => {
  assert.equal(balanceChemicalEquation("H2 + O2 -> H2O").equation, "2H2 + O2 → 2H2O");
  assert.equal(balanceChemicalEquation("Fe + O2 -> Fe2O3").equation, "4Fe + 3O2 → 2Fe2O3");
  assert.equal(balanceChemicalEquation("Ca(OH)2 + HCl -> CaCl2 + H2O").equation, "Ca(OH)2 + 2HCl → CaCl2 + 2H2O");
});

test("reaction parser reports ambiguity or malformed equations rather than guessing", () => {
  assert.throws(() => balanceChemicalEquation("H2 + O2"), /Escribe la ecuación/);
  assert.throws(() => balanceChemicalEquation("H2 + O2 -> CO2"), /positivos|solución/);
});

test("molecule explorer data includes formula, geometry, properties, uses and bonds", () => {
  assert.ok(chemistryMolecules.length >= 5);
  assert.ok(chemistryMolecules.every(molecule => molecule.raw && molecule.formula && molecule.geometry && molecule.properties && molecule.uses && molecule.bonds.length));
});
