import {
  guidelineValueImportSchema,
  omrGuidelineCaptureRun,
  omrPlanningLedger,
  omrPlanningSummary,
  unresolvedPlanningRecords,
} from "../../../data/evidence";

export async function GET() {
  return Response.json({
    generatedAt: "2026-07-15",
    scopeId: omrPlanningLedger.scopeId,
    planning: {
      summary: omrPlanningSummary,
      methodology: omrPlanningLedger.methodology,
      coverageCaveat: omrPlanningLedger.coverageCaveat,
      sources: omrPlanningLedger.sources,
      records: omrPlanningLedger.records,
      unresolvedCrosswalks: unresolvedPlanningRecords,
    },
    guidelineValueCollection: {
      captureRun: omrGuidelineCaptureRun,
      importContract: {
        id: guidelineValueImportSchema.$id,
        schemaVersion: guidelineValueImportSchema.properties.schemaVersion.const,
        requiredBatchFields: guidelineValueImportSchema.required,
        requiredRowFields: guidelineValueImportSchema.properties.rows.items.required,
      },
    },
  });
}
