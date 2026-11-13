import test from "node:test";
import assert from "node:assert/strict";
import { buildPdf, buildPptx } from "../src/lib/presentation-export.ts";

const project = {
  id: "export-test", title: "Prueba de exportación", topic: "Energía solar", goal: "Explicar sus fundamentos", style: "minimal", detail: "balanced", citations: ["Material de referencia proporcionado"], updatedAt: new Date(0).toISOString(),
  slides: [
    { id: "s1", kind: "title", title: "Energía solar", subtitle: "Fundamentos", body: "Una introducción", bullets: [], visualIdea: "Sol" },
    { id: "s2", kind: "content", title: "Cómo funciona", subtitle: "", body: "Las células convierten luz en electricidad.", bullets: ["Panel fotovoltaico", "Corriente eléctrica"], visualIdea: "Diagrama del proceso" },
    { id: "s3", kind: "conclusion", title: "Conclusión", subtitle: "", body: "", bullets: ["La energía solar es renovable"], visualIdea: "" },
  ],
};

test("PPTX export creates a valid editable Office ZIP presentation", async () => {
  const pptx = buildPptx(project);
  const data = await pptx.write({ outputType: "nodebuffer", compression: true });
  const bytes = Buffer.from(data);
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
  assert.ok(bytes.includes(Buffer.from("ppt/slides/slide1.xml")));
  assert.ok(bytes.includes(Buffer.from("Cómo funciona")));
});

test("PDF export creates a multi-page PDF with slide content", () => {
  const bytes = Buffer.from(buildPdf(project));
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok(bytes.includes(Buffer.from("/Count 3")));
});
