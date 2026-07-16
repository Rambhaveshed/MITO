import coverage from "./coverage/omr-corridor.json";
import { omrGuidelineSnapshotSummary, omrPlanningSummary } from "./evidence";

export type OmrCoverageStatus = "not_started" | "collecting" | "captured" | "verified" | "blocked";

export type OmrCoverageUnit = (typeof coverage.units)[number];
export type OmrRegistrationOffice = (typeof coverage.registrationOffices)[number];

const units = coverage.units as OmrCoverageUnit[];

export const omrCoverage = coverage;

export const omrCoverageSummary = {
  unitCount: units.length,
  officeCount: coverage.registrationOffices.length,
  jurisdictionVerifiedCount: units.filter((unit) => unit.jurisdictionStatus === "verified").length,
  currentStreetInventoryVerifiedCount: units.filter(
    (unit) => "streetTargetEvidenceStatus" in unit && unit.streetTargetEvidenceStatus === "live_official_metadata",
  ).length,
  streetRegisterVerifiedCount: units.filter((unit) => unit.streetRegisterStatus === "verified").length,
  officialGuidelineRecordCount: units.reduce((sum, unit) => sum + unit.officialGuidelineRecords, 0),
  archivedGuidelineRecordCount: omrGuidelineSnapshotSummary.recordCount,
  pendingGuidelineRecheckCount: omrGuidelineSnapshotSummary.pendingLiveRecheckCount,
  registeredTransactionRecordCount: units.reduce((sum, unit) => sum + unit.registeredTransactionRecords, 0),
  officialPlanningRecordCount: omrPlanningSummary.recordCount,
  planningVillageCount: omrPlanningSummary.villageCount,
  unresolvedPlanningRecordCount: omrPlanningSummary.unresolvedRecordCount,
  unplottedCount: units.filter((unit) => unit.geometryStatus === "unplotted").length,
};

export const omrCoveragePercent = {
  jurisdiction: Math.round((omrCoverageSummary.jurisdictionVerifiedCount / omrCoverageSummary.unitCount) * 100),
  currentInventory: Math.round((omrCoverageSummary.currentStreetInventoryVerifiedCount / omrCoverageSummary.unitCount) * 100),
  streetRegister: Math.round((omrCoverageSummary.streetRegisterVerifiedCount / omrCoverageSummary.unitCount) * 100),
  planning: Math.round((omrCoverageSummary.planningVillageCount / omrCoverageSummary.unitCount) * 100),
};

export const omrCoverageByOffice = coverage.registrationOffices.map((office) => ({
  ...office,
  units: units.filter((unit) => unit.officialSroCode === office.officialSroCode),
}));

export const omrReleaseReady =
  omrCoverageSummary.jurisdictionVerifiedCount === omrCoverageSummary.unitCount &&
  omrCoverageSummary.streetRegisterVerifiedCount === omrCoverageSummary.unitCount &&
  units.every(
    (unit) =>
      unit.streetTargetCount !== null &&
      unit.officialGuidelineRecords >= coverage.releaseGate.minimumOfficialGuidelineRecordsPerUnit &&
      Boolean(unit.verifiedAt),
  );
