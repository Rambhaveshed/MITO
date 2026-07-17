import {
  guidelineValueImportSchema,
  omrGuidelineCaptureRun,
  omrGuidelineLiveRegisterAudit,
  omrGuidelineLiveRegisterSummary,
  omrGuidelineOmrInventoryAudit,
  omrGuidelineSecondaryCorroborationLedger,
  omrGuidelineSecondaryCorroborationSummary,
  omrGuidelineSnapshotLedger,
  omrGuidelineSnapshotSummary,
  omrOfficialAllotmentRateLedger,
  omrOfficialAllotmentRateSummary,
  omrPlanningLedger,
  omrPlanningSummary,
  unresolvedPlanningRecords,
} from "../../../data/evidence";

export async function GET() {
  return Response.json({
    generatedAt: "2026-07-17",
    scopeId: omrPlanningLedger.scopeId,
    planning: {
      summary: omrPlanningSummary,
      methodology: omrPlanningLedger.methodology,
      coverageCaveat: omrPlanningLedger.coverageCaveat,
      sources: omrPlanningLedger.sources,
      records: omrPlanningLedger.records,
      unresolvedCrosswalks: unresolvedPlanningRecords,
    },
    officialAllotmentRates: {
      summary: omrOfficialAllotmentRateSummary,
      source: omrOfficialAllotmentRateLedger.source,
      tenureEvidence: omrOfficialAllotmentRateLedger.tenureEvidence,
      location: omrOfficialAllotmentRateLedger.location,
      subsidy: omrOfficialAllotmentRateLedger.subsidy,
      records: omrOfficialAllotmentRateLedger.records,
      publication: omrOfficialAllotmentRateLedger.publication,
      publicationRule: "These rows are SIPCOT leasehold allotment plot costs. They must never be relabelled as guideline values, registered transactions, asking prices, market estimates or a village-wide Siruseri rate.",
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
        source: omrGuidelineOmrInventoryAudit.source,
        retrievalPath: omrGuidelineOmrInventoryAudit.retrievalPath,
        queries: omrGuidelineOmrInventoryAudit.queries,
        reconciliation: omrGuidelineLiveRegisterAudit.reconciliation,
        publication: omrGuidelineOmrInventoryAudit.publication,
        limitations: omrGuidelineOmrInventoryAudit.limitations,
        publicationRule: "MITO publishes the 24 current official village inventory counts and retrieval metadata, but no row-level register content until Registration Department reuse permission or an authorized licence is confirmed.",
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
