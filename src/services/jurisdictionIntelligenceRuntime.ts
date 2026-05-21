import { inspectionRequirementRepository, jurisdictionRepository, permitRequirementRepository } from '../db/repositories';

export interface JurisdictionGuidanceResult {
  source: 'user_override' | 'cached_jurisdiction' | 'generic_trade';
  messages: string[];
}

export class JurisdictionIntelligenceRuntime {
  static async getGuidance(input: {
    jobsiteZip?: string | null;
    trade: string;
    specialty: string;
    userOverrideNotes?: string | null;
  }): Promise<JurisdictionGuidanceResult> {
    if (input.userOverrideNotes?.trim()) {
      return { source: 'user_override', messages: [input.userOverrideNotes.trim()] };
    }

    const jurisdiction = input.jobsiteZip
      ? (await jurisdictionRepository.getByZip(input.jobsiteZip).catch(() => undefined))
      : undefined;

    if (jurisdiction) {
      const [permits, inspections] = await Promise.all([
        permitRequirementRepository.getByJurisdiction(jurisdiction.jurisdiction_id).catch(() => []),
        inspectionRequirementRepository.getByJurisdiction(jurisdiction.jurisdiction_id).catch(() => []),
      ]);
      return {
        source: 'cached_jurisdiction',
        messages: [
          `Use cached guidance for ${jurisdiction.ahj_name ?? jurisdiction.city ?? jurisdiction.zip}.`,
          ...permits.map((permit) => permit.requirement_description),
          ...inspections.flatMap((inspection) => inspection.readiness_rules),
        ],
      };
    }

    return {
      source: 'generic_trade',
      messages: [
        `Use the ${input.trade} - ${input.specialty} Trade Template Pack as offline generic guidance.`,
        'Verify final code, permit, utility, and inspection requirements with the local authority having jurisdiction.',
      ],
    };
  }
}
