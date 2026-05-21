import test from "node:test";
import assert from "node:assert/strict";
import { TradeTemplatePackService } from "./tradeTemplatePackService";

test("loads and validates all bundled trade template packs", () => {
  const packs = TradeTemplatePackService.getAllPacks();

  assert.equal(packs.length, 7);
  assert.deepEqual(TradeTemplatePackService.validateAllPacks(), { valid: true, errors: [] });
});

test("every bundled pack maps office internal job record as a first-class Pro Report", () => {
  for (const pack of TradeTemplatePackService.getAllPacks()) {
    const mapping = pack.reportMappings.find((item) => item.reportType === "office_internal_record");
    assert.ok(mapping, `${pack.packId} is missing office_internal_record`);
    assert.equal(mapping?.title, "Office / Internal Job Record Pro Report");
    assert.equal(mapping?.includeDocuments, true);
    assert.equal(mapping?.includeStructuredVoiceNotes, true);
    assert.equal(mapping?.includeMissingProofWarnings, true);
  }
});

test("every bundled pack includes an inspection proof section", () => {
  for (const pack of TradeTemplatePackService.getAllPacks()) {
    assert.ok(
      pack.stages.some((stage) => stage.stageType === "inspection_proof"),
      `${pack.packId} is missing inspection_proof`,
    );
  }
});

test("every bundled pack preserves required inspection prompt coverage", () => {
  const prompts = [
    "permit document",
    "inspection card",
    "utility approval",
    "correction notice",
    "plan page",
    "manufacturer installation instructions",
    "ahj notes",
    "inspector punch list",
    "final completion proof",
  ];

  for (const pack of TradeTemplatePackService.getAllPacks()) {
    const inspection = pack.stages.find((stage) => stage.stageType === "inspection_proof");
    const text = inspection?.steps.flatMap((step) => [step.title, step.plainLanguagePrompt]).join(" ").toLowerCase() ?? "";
    for (const prompt of prompts) {
      assert.ok(text.includes(prompt), `${pack.packId} is missing ${prompt}`);
    }
  }
});

test("generator install pack includes required proof coverage and missing-proof warnings", () => {
  const pack = TradeTemplatePackService.getPack("generator_install_v1");
  const steps = pack.stages.flatMap((stage) => stage.steps);
  const stepIds = new Set(steps.map((step) => step.stepId));

  for (const stepId of [
    "meter_before",
    "main_panel_before",
    "transfer_switch_install",
    "fuel_line_install",
    "mounting_area_before",
    "generator_placement",
    "startup_test",
    "final_install",
    "permit_or_inspection_document",
    "customer_completion_signoff",
  ]) {
    assert.ok(stepIds.has(stepId), `missing ${stepId}`);
  }

  assert.match(steps.find((step) => step.stepId === "transfer_switch_install")?.missingProofWarning ?? "", /Transfer switch proof is missing/i);
  assert.match(steps.find((step) => step.stepId === "fuel_line_install")?.missingProofWarning ?? "", /Fuel line proof is missing/i);
  assert.match(steps.find((step) => step.stepId === "final_install")?.missingProofWarning ?? "", /Final installation proof is missing/i);
});
