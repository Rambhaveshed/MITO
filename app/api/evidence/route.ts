import {
  guidelineValueImportSchema,
  omrGuidelineCaptureRun,
  omrGuidelineLiveRegisterAudit,
  omrGuidelineLiveRegisterSummary,
  omrGuidelineSecondaryCorroborationLedger,
  omrGuidelineSecondaryCorroborationSummary,
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
      currentOfficialRegister: {
        summary: omrGuidelineLiveRegisterSummary,
        source: omrGuidelineLiveRegisterAudit.source,
        retrievalPath: omrGuidelineLiveRegisterAudit.retrievalPath,
        query: omrGuidelineLiveRegisterAudit.query,
        reconciliation: omrGuidelineLiveRegisterAudit.reconciliation,
        publication: omrGuidelineLiveRegisterAudit.publication,
        limitations: omrGuidelineLiveRegisterAudit.limitations,
        publicationRule: "MITO publishes the current official inventory count and retrieval metadata, but no row-level register content until Registration Department reuse permission or an authorized licence is confirmed.",
      },
      secondaryCorroboration: {
        summary: omrGuidelineSecondaryCorroborationSummary,
        audit: omrGuidelineSecondaryCorroborationLedger.audit,
        scopeClaims: omrGuidelineSecondaryCorroborationLedger.scopeClaims,
        matchedRows: omrGuidelineSecondaryCorroborationLedger.matchedRows,
        conflicts: omrGuidelineSecondaryCorroborationLedger.conflicts,
        publicationRule: "A third-party field match is a discovery and transcription-check signal only. It cannot increase current official coverage or pass a release gate.",
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
