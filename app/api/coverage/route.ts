import { omrCoverage, omrCoverageByOffice, omrCoverageSummary, omrReleaseReady } from "../../../data/omr";

export async function GET() {
  return Response.json({
    generatedAt: "2026-07-15",
    programme: {
      id: omrCoverage.id,
      name: omrCoverage.name,
      definition: omrCoverage.definition,
      status: omrCoverage.status,
      publishedCoverageClaim: omrCoverage.publishedCoverageClaim,
      releaseReady: omrReleaseReady,
    },
    summary: omrCoverageSummary,
    releaseGate: omrCoverage.releaseGate,
    source: omrCoverage.source,
    offices: omrCoverageByOffice,
  });
}
