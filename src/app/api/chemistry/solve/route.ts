import { authorizePremiumStudyTool } from "@/lib/study-access";
import { balanceChemicalEquation, molarMass } from "@/lib/chemistry";

export async function POST(request: Request) {
  const access = await authorizePremiumStudyTool("Química");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers: { "Cache-Control": "no-store" } });

  let input: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "La solicitud no tiene un formato válido." }, { status: 400 });
    input = body as Record<string, unknown>;
  } catch { return Response.json({ error: "La solicitud no tiene un formato válido." }, { status: 400 }); }

  try {
    if (input.action === "balance") {
      if (typeof input.equation !== "string" || input.equation.length > 500) return Response.json({ error: "Escribe una ecuación de hasta 500 caracteres." }, { status: 400 });
      return Response.json({ result: balanceChemicalEquation(input.equation) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (input.action !== "calculate" || typeof input.kind !== "string") return Response.json({ error: "La operación química solicitada no es válida." }, { status: 400 });
    const value = (name: string) => {
      const number = input[name];
      if (typeof number !== "number" || !Number.isFinite(number)) throw new Error(`Falta un valor numérico válido para ${name}.`);
      return number;
    };
    let result: number; let unit: string; let steps: string[];
    if (input.kind === "molarMass") {
      if (typeof input.formula !== "string" || input.formula.length > 100) throw new Error("Escribe una fórmula válida.");
      result = molarMass(input.formula); unit = "g/mol"; steps = [`M(${input.formula}) = ${result.toFixed(4)} g/mol según las masas atómicas del catálogo de la tabla periódica.`];
    } else if (input.kind === "molesFromMass" || input.kind === "massFromMoles") {
      if (typeof input.formula !== "string" || input.formula.length > 100) throw new Error("Escribe una fórmula válida.");
      const mass = molarMass(input.formula);
      if (input.kind === "molesFromMass") { const m = value("mass"); if (m < 0) throw new Error("La masa no puede ser negativa."); result = m / mass; unit = "mol"; steps = [`M(${input.formula}) = ${mass.toFixed(4)} g/mol.`, `n = m / M = ${m} g / ${mass.toFixed(4)} g/mol = ${result.toPrecision(6)} mol.`]; }
      else { const n = value("moles"); if (n < 0) throw new Error("Los moles no pueden ser negativos."); result = n * mass; unit = "g"; steps = [`M(${input.formula}) = ${mass.toFixed(4)} g/mol.`, `m = n × M = ${n} mol × ${mass.toFixed(4)} g/mol = ${result.toPrecision(6)} g.`]; }
    } else if (input.kind === "molarity") {
      const n = value("moles"), v = value("volume"); if (n < 0 || v <= 0) throw new Error("Los moles no pueden ser negativos y el volumen debe ser mayor que cero.");
      result = n / v; unit = "mol/L"; steps = [`C = n / V = ${n} mol / ${v} L = ${result.toPrecision(6)} mol/L.`];
    } else if (input.kind === "dilution") {
      const c1 = value("initialConcentration"), v1 = value("initialVolume"), c2 = input.finalConcentration === undefined ? null : value("finalConcentration");
      if (c1 <= 0 || v1 <= 0 || (c2 !== null && c2 <= 0)) throw new Error("Las concentraciones y volúmenes deben ser mayores que cero.");
      if (c2 === null) { result = c1 * v1; unit = "mol/L·L"; steps = [`C₁V₁ = ${c1} mol/L × ${v1} L = ${result.toPrecision(6)} mol.`]; }
      else { result = c1 * v1 / c2; unit = "L"; steps = [`V₂ = C₁V₁ / C₂ = (${c1} mol/L × ${v1} L) / ${c2} mol/L = ${result.toPrecision(6)} L.`]; }
    } else if (input.kind === "stoichiometry") {
      const n = value("moles"), from = value("coefficientFrom"), to = value("coefficientTo");
      if (n < 0 || from <= 0 || to <= 0) throw new Error("Los moles no pueden ser negativos; los coeficientes deben ser positivos.");
      result = n * to / from; unit = "mol"; steps = [`Relación molar: ν₂/ν₁ = ${to}/${from}.`, `n₂ = n₁ × (ν₂/ν₁) = ${n} mol × ${to}/${from} = ${result.toPrecision(6)} mol. Usa coeficientes de una ecuación balanceada.`];
    } else if (input.kind === "convert") {
      const amount = value("amount"), conversions: Record<string, { factor: number; unit: string }> = { "g a kg": { factor: .001, unit: "kg" }, "kg a g": { factor: 1000, unit: "g" }, "mg a g": { factor: .001, unit: "g" }, "g a mg": { factor: 1000, unit: "mg" }, "mL a L": { factor: .001, unit: "L" }, "L a mL": { factor: 1000, unit: "mL" }, "mol a mmol": { factor: 1000, unit: "mmol" }, "mmol a mol": { factor: .001, unit: "mol" } };
      if (typeof input.conversion !== "string" || !conversions[input.conversion]) throw new Error("Selecciona una conversión disponible.");
      const conversion = conversions[input.conversion]; result = amount * conversion.factor; unit = conversion.unit; steps = [`Factor de conversión: ${conversion.factor}.`, `${amount} ${input.conversion.split(" a ")[0]} × ${conversion.factor} = ${result} ${unit}.`];
    } else return Response.json({ error: "El tipo de cálculo no está disponible." }, { status: 400 });

    if (!Number.isFinite(result)) throw new Error("El resultado no es finito; revisa las unidades y los valores.");
    return Response.json({ result: `${Number(result.toPrecision(6)).toLocaleString("es-UY")} ${unit}`, steps }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo completar el cálculo químico." }, { status: 400 });
  }
}
