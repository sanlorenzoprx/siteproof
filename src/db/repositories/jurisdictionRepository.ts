import { InspectionRequirement, JurisdictionProfile, PermitRequirement } from '../schema';
import { BaseRepository } from './baseRepository';

class JurisdictionRepository extends BaseRepository<JurisdictionProfile> {
  constructor() {
    super('jurisdiction_profiles', 'jurisdiction_id');
  }

  getByZip(zip: string): Promise<JurisdictionProfile | undefined> {
    return this.getFirstFromIndex('zip', zip);
  }
}

class PermitRequirementRepository extends BaseRepository<PermitRequirement> {
  constructor() {
    super('permit_requirements', 'permit_requirement_id');
  }

  getByJurisdiction(jurisdictionId: string): Promise<PermitRequirement[]> {
    return this.getByIndex('jurisdiction_id', jurisdictionId);
  }
}

class InspectionRequirementRepository extends BaseRepository<InspectionRequirement> {
  constructor() {
    super('inspection_requirements', 'inspection_requirement_id');
  }

  getByJurisdiction(jurisdictionId: string): Promise<InspectionRequirement[]> {
    return this.getByIndex('jurisdiction_id', jurisdictionId);
  }
}

export const jurisdictionRepository = new JurisdictionRepository();
export const permitRequirementRepository = new PermitRequirementRepository();
export const inspectionRequirementRepository = new InspectionRequirementRepository();
