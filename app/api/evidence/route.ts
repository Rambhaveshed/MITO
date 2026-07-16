import {
  guidelineValueImportSchema,
  omrGuidelineCaptureRun,
  omrGuidelineSnapshotLedger,
  omrGuidelineSnapshotSummary,
  omrPlanningLedger,
  omrPlanningSummary,
  unresolvedPlanningRecords,
} from "../../../data/evidence";

export async function GET() {
  return Response.json({
    generatedAt: "2026-07-16",
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
      archivedSnapshot: {
        summary: omrGuidelineSnapshotSummary,
        source: omrGuidelineSnapshotLedger.source,
        records: omrGuidelineSnapshotLedger.rows,
        publicationRule: "Archived snapshot rows remain pending and unplotted until the live official source is rechecked. They are excluded from current verified totals.",
      },
      importContract: {
        id: guidelineValueImportSchema.$id,
        schemaVersion: guidelineValueImportSchema.properties.schemaVersion.const,
        requiredBatchFields: guidelineValueImportSchema.required,
        requiredRowFields: guidelineValueImportSchema.properties.rows.items.required,
      },
    },
  });
}
