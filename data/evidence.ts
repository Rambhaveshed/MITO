import captureRun from "./capture-runs/omr-guideline-2026-07-15.json";
import guidelineImportSchema from "./evidence/guideline-value-import.schema.json";
import planningLedger from "./evidence/omr-planning-records.json";

export type PlanningEvidenceRecord = (typeof planningLedger.records)[number];

const linkedPlanningRecords = planningLedger.records.filter(
  (record) => record.mappingStatus === "verified" && record.officialVillageCode !== null,
);

const planningVillageKeys = new Set(
  linkedPlanningRecords.map((record) => `${record.officialSroCode}:${record.officialVillageCode}`),
);

export const omrPlanningLedger = planningLedger;
export const omrGuidelineCaptureRun = captureRun;
export const guidelineValueImportSchema = guidelineImportSchema;

export const omrPlanningSummary = {
  recordCount: planningLedger.records.length,
  linkedRecordCount: linkedPlanningRecords.length,
  unresolvedRecordCount: planningLedger.records.length - linkedPlanningRecords.length,
  villageCount: planningVillageKeys.size,
  sourceCount: planningLedger.sources.length,
  unplottedRecordCount: planningLedger.records.filter((record) => record.geometryStatus === "unplotted").length,
};

export function planningRecordsForVillage(officialSroCode: string, officialVillageCode: string) {
  return linkedPlanningRecords.filter(
    (record) => record.officialSroCode === officialSroCode && record.officialVillageCode === officialVillageCode,
  );
}

export const unresolvedPlanningRecords = planningLedger.records.filter(
  (record) => record.mappingStatus !== "verified",
);
