import captureRun from "./capture-runs/omr-guideline-2026-07-16.json";
import guidelineImportSchema from "./evidence/guideline-value-import.schema.json";
import guidelineSnapshot from "./evidence/omr-guideline-archived-snapshot-2026-07-16.json";
import guidelineSecondaryCorroboration from "./evidence/omr-guideline-secondary-corroboration-2026-07-16.json";
import guidelineLiveRegisterAudit from "./evidence/tnreginet-live-register-audit-2026-07-16.json";
import guidelineOmrInventoryAudit from "./evidence/tnreginet-omr-inventory-audit-2026-07-16.json";
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
export const omrGuidelineSnapshotLedger = guidelineSnapshot;
export const omrGuidelineSecondaryCorroborationLedger = guidelineSecondaryCorroboration;
export const omrGuidelineLiveRegisterAudit = guidelineLiveRegisterAudit;
export const omrGuidelineOmrInventoryAudit = guidelineOmrInventoryAudit;
export const guidelineValueImportSchema = guidelineImportSchema;

const snapshotVillageKeys = new Set(
  guidelineSnapshot.rows.map((record) => `${record.officialSroCode}:${record.officialVillageCode}`),
);

export const omrGuidelineSnapshotSummary = {
  recordCount: guidelineSnapshot.rows.length,
  pendingLiveRecheckCount: guidelineSnapshot.rows.filter((record) => record.verificationStatus === "pending").length,
  verifiedCurrentCount: guidelineSnapshot.rows.filter((record) => record.verificationStatus === "verified").length,
  villageCount: snapshotVillageKeys.size,
  unplottedCount: guidelineSnapshot.rows.filter((record) => record.geometryStatus === "unplotted").length,
  streetInventoryCountAtSnapshot: guidelineSnapshot.source.streetInventoryCountAtSnapshot,
};

export const omrGuidelineSecondaryCorroborationSummary = {
  matchedRowCount: guidelineSecondaryCorroboration.matchedRows.length,
  exactFieldMatchCount: guidelineSecondaryCorroboration.matchedRows.filter(
    (record) => record.corroborationStatus === "exact_field_match",
  ).length,
  conflictCount: guidelineSecondaryCorroboration.conflicts.length,
  claimedStreetCount: guidelineSecondaryCorroboration.scopeClaims.claimedStreetCount,
  currentOfficialPromotionCount: guidelineSecondaryCorroboration.matchedRows.filter(
    (record) => record.currentOfficialValue,
  ).length,
};

export const omrGuidelineLiveRegisterSummary = {
  auditedVillageCount: guidelineOmrInventoryAudit.summary.auditedVillageCount,
  targetVillageCount: guidelineOmrInventoryAudit.summary.targetVillageCount,
  currentInventoryCount: guidelineOmrInventoryAudit.summary.displayedItemCountTotal,
  sholinganallur1InventoryCount: guidelineLiveRegisterAudit.query.displayedItemCount,
  visibleRowsInspected: guidelineLiveRegisterAudit.query.visibleRowsInspected,
  currentOfficialRowsStored: guidelineOmrInventoryAudit.summary.currentOfficialRowsStored,
  currentOfficialValuesPublished: guidelineOmrInventoryAudit.summary.currentOfficialGuidelineValuesPublished,
  officialStreetCodePublished: guidelineOmrInventoryAudit.summary.officialStreetCodesPublished > 0,
  permissionRequired: guidelineOmrInventoryAudit.source.reproductionPolicy === "permission_required",
  reconciliationStatus: guidelineLiveRegisterAudit.reconciliation.status,
};

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

export function archivedGuidelineRecordsForVillage(officialSroCode: string, officialVillageCode: string) {
  return guidelineSnapshot.rows.filter(
    (record) => record.officialSroCode === officialSroCode && record.officialVillageCode === officialVillageCode,
  );
}

export const unresolvedPlanningRecords = planningLedger.records.filter(
  (record) => record.mappingStatus !== "verified",
);
