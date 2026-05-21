import generatorInstallPack from "../templates/packs/generator_install_v1.json";
import roofingStormDamagePack from "../templates/packs/roofing_storm_damage_v1.json";
import electricalServicePack from "../templates/packs/electrical_service_v1.json";
import hvacInstallPack from "../templates/packs/hvac_install_v1.json";
import plumbingRepairPack from "../templates/packs/plumbing_repair_v1.json";
import restorationWaterDamagePack from "../templates/packs/restoration_water_damage_v1.json";
import solarSiteSurveyPack from "../templates/packs/solar_site_survey_v1.json";
import {
  ProReportType,
  TradePackValidationResult,
  TradeTemplatePack,
} from "../templates/tradeTemplatePack.types";

export interface TradeSpecialtyOption {
  packId: string;
  trade: string;
  specialty: string;
  displayName: string;
  description?: string;
}

const REQUIRED_REPORT_TYPES: ProReportType[] = [
  "customer_completion",
  "inspection_readiness",
  "change_order_evidence",
  "payment_handoff",
  "photo_timeline",
  "office_internal_record",
  "all_pro_reports",
];

const REQUIRED_INSPECTION_PROMPTS = [
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

const generatorInstall = generatorInstallPack as TradeTemplatePack;

const bundledTradePacks: TradeTemplatePack[] = [
  generatorInstall,
  roofingStormDamagePack as TradeTemplatePack,
  electricalServicePack as TradeTemplatePack,
  hvacInstallPack as TradeTemplatePack,
  plumbingRepairPack as TradeTemplatePack,
  restorationWaterDamagePack as TradeTemplatePack,
  solarSiteSurveyPack as TradeTemplatePack,
];

export class TradeTemplatePackService {
  static getAllPacks(): TradeTemplatePack[] {
    return bundledTradePacks;
  }

  static getOptions(): TradeSpecialtyOption[] {
    return bundledTradePacks.map((pack) => ({
      packId: pack.packId,
      trade: pack.trade,
      specialty: pack.specialty,
      displayName: pack.displayName,
      description: pack.description,
    }));
  }

  static getPack(packId?: string | null): TradeTemplatePack {
    return bundledTradePacks.find((pack) => pack.packId === packId) ?? generatorInstall;
  }

  static findPack(trade?: string | null, specialty?: string | null): TradeTemplatePack {
    const normalizedTrade = trade?.toLowerCase();
    const normalizedSpecialty = specialty?.toLowerCase();
    return (
      bundledTradePacks.find(
        (pack) =>
          pack.trade.toLowerCase() === normalizedTrade &&
          pack.specialty.toLowerCase() === normalizedSpecialty,
      ) ?? generatorInstall
    );
  }

  static validatePack(pack: TradeTemplatePack): TradePackValidationResult {
    const errors: string[] = [];
    if (!pack.packId) errors.push("packId is required");
    if (!pack.trade) errors.push(`${pack.packId}: trade is required`);
    if (!pack.specialty) errors.push(`${pack.packId}: specialty is required`);
    if (!pack.stages.length) errors.push(`${pack.packId}: at least one stage is required`);
    const inspectionStage = pack.stages.find((stage) => stage.stageType === "inspection_proof");
    if (!inspectionStage) {
      errors.push(`${pack.packId}: inspection_proof stage is required`);
    }
    const inspectionText = inspectionStage?.steps
      .flatMap((step) => [step.title, step.plainLanguagePrompt])
      .join(" ")
      .toLowerCase() ?? "";
    for (const prompt of REQUIRED_INSPECTION_PROMPTS) {
      if (!inspectionText.includes(prompt)) {
        errors.push(`${pack.packId}: inspection_proof missing prompt for ${prompt}`);
      }
    }
    for (const reportType of REQUIRED_REPORT_TYPES) {
      if (!pack.reportMappings.some((mapping) => mapping.reportType === reportType)) {
        errors.push(`${pack.packId}: missing report mapping ${reportType}`);
      }
    }
    for (const stage of pack.stages) {
      for (const step of stage.steps) {
        if (!step.stepId) errors.push(`${pack.packId}/${stage.stageId}: stepId is required`);
        if (!step.missingProofWarning) errors.push(`${pack.packId}/${step.stepId}: missing-proof warning is required`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  static validateAllPacks(): TradePackValidationResult {
    const errors = bundledTradePacks.flatMap((pack) => this.validatePack(pack).errors);
    return { valid: errors.length === 0, errors };
  }
}
