import {
  chennaiGeometrySourceAudit,
  chennaiRevenueCoverage,
  chennaiRevenueSummary,
  chennaiRegistrationCrosswalk,
  chennaiTalukCrosswalkProgress,
  resolveChennaiRevenuePlace,
} from "../../../data/chennai";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query");

  return Response.json({
    generatedAt: "2026-07-17",
    scopeId: chennaiRevenueCoverage.id,
    scopeDefinition: chennaiRevenueCoverage.scopeDefinition,
    summary: chennaiRevenueSummary,
    officialClaims: chennaiRevenueCoverage.officialClaims,
    conflicts: chennaiRevenueCoverage.conflicts,
    publication: chennaiRevenueCoverage.publication,
    registrationCrosswalk: {
      id: chennaiRegistrationCrosswalk.id,
      compiledAt: chennaiRegistrationCrosswalk.compiledAt,
      methodology: chennaiRegistrationCrosswalk.methodology,
      summary: chennaiRegistrationCrosswalk.summary,
      publication: chennaiRegistrationCrosswalk.publication,
      limitations: chennaiRegistrationCrosswalk.limitations,
    },
    geometrySourceAudit: chennaiGeometrySourceAudit,
    sources: chennaiRevenueCoverage.sources,
    talukCrosswalkProgress: query === null ? chennaiTalukCrosswalkProgress : undefined,
    taluks: query === null ? chennaiRevenueCoverage.taluks : undefined,
    resolution: query === null ? undefined : resolveChennaiRevenuePlace(query),
  });
}
