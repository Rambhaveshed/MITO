import chennaiRevenue from "./coverage/chennai-district-revenue-2026-07-16.json";
import geometrySourceAudit from "./evidence/chennai-geometry-source-audit-2026-07-17.json";
import registrationCrosswalk from "./evidence/chennai-registration-crosswalk-2026-07-17.json";

export type ChennaiRevenueTaluk = (typeof chennaiRevenue.taluks)[number];

export type ChennaiRevenueUnit = {
  key: string;
  sequence: number;
  name: string;
  talukSequence: number;
  talukName: string;
  firkaCount: number;
  sourceStatus: "official_source_listed";
  registrationCrosswalkStatus: "verified" | "ambiguous" | "not_started";
  registrationCrosswalk: {
    officialDistrictCode: string;
    officialDistrictName: string;
    officialSroCode: string;
    officialSroName: string;
    officialVillageCode: string;
    registrationVillageName: string;
    registrationVillageNameTa: string;
    guidelineVillageName: string;
    currentInventoryItemCount: number;
    currentInventoryAsOf: string;
    verifiedAt: string;
    evidenceSourceId: string;
    matchMethod: string;
  } | null;
  crosswalkAmbiguity: {
    candidateOfficialSroCode: string;
    candidateOfficialVillageCode: string;
    candidateRegistrationVillageName: string;
    reason: string;
  } | null;
  geometryStatus: "unplotted";
  officialGuidelineValues: 0;
  registeredTransactions: 0;
};

const verifiedCrosswalkByKey = new Map(
  registrationCrosswalk.records.map((record) => [record.chennaiSourceKey, record]),
);

const crosswalkAmbiguityByKey = new Map(
  registrationCrosswalk.ambiguities.map((record) => [record.chennaiSourceKey, record]),
);

export function normalizeChennaiSearchTerm(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[\s\-_.(),/]+/g, "")
    .trim();
}

export const chennaiRevenueUnits: ChennaiRevenueUnit[] = chennaiRevenue.taluks.flatMap((taluk) =>
  taluk.villages.map((name, index) => {
    const key = `${taluk.sequence}:${index + 1}`;
    const verifiedCrosswalk = verifiedCrosswalkByKey.get(key);
    const ambiguity = crosswalkAmbiguityByKey.get(key);

    return {
      key,
      sequence: index + 1,
      name,
      talukSequence: taluk.sequence,
      talukName: taluk.sourceName,
      firkaCount: taluk.firkaCount,
      sourceStatus: "official_source_listed" as const,
      registrationCrosswalkStatus: verifiedCrosswalk ? "verified" as const : ambiguity ? "ambiguous" as const : "not_started" as const,
      registrationCrosswalk: verifiedCrosswalk ? {
        officialDistrictCode: verifiedCrosswalk.officialDistrictCode,
        officialDistrictName: verifiedCrosswalk.officialDistrictName,
        officialSroCode: verifiedCrosswalk.officialSroCode,
        officialSroName: verifiedCrosswalk.officialSroName,
        officialVillageCode: verifiedCrosswalk.officialVillageCode,
        registrationVillageName: verifiedCrosswalk.registrationVillageName,
        registrationVillageNameTa: verifiedCrosswalk.registrationVillageNameTa,
        guidelineVillageName: verifiedCrosswalk.guidelineVillageName,
        currentInventoryItemCount: verifiedCrosswalk.currentInventoryItemCount,
        currentInventoryAsOf: verifiedCrosswalk.currentInventoryAsOf,
        verifiedAt: verifiedCrosswalk.verifiedAt,
        evidenceSourceId: verifiedCrosswalk.evidenceSourceId,
        matchMethod: verifiedCrosswalk.matchMethod,
      } : null,
      crosswalkAmbiguity: ambiguity ? {
        candidateOfficialSroCode: ambiguity.candidateOfficialSroCode,
        candidateOfficialVillageCode: ambiguity.candidateOfficialVillageCode,
        candidateRegistrationVillageName: ambiguity.candidateRegistrationVillageName,
        reason: ambiguity.reason,
      } : null,
      geometryStatus: "unplotted" as const,
      officialGuidelineValues: 0 as const,
      registeredTransactions: 0 as const,
    };
  }),
);

export type ChennaiRevenueResolverStatus = "empty" | "matched" | "taluk" | "ambiguous" | "partial" | "none";

export function resolveChennaiRevenuePlace(input: string) {
  const query = input.trim();
  const normalizedQuery = normalizeChennaiSearchTerm(query);
  const base = { query, normalizedQuery };

  if (!normalizedQuery) {
    return {
      ...base,
      status: "empty" as ChennaiRevenueResolverStatus,
      explanation: "Enter a source-listed revenue village or taluk. Tamil and registration aliases are not yet verified for this expansion scope.",
      matches: chennaiRevenueUnits,
    };
  }

  if (normalizedQuery === "chennai" || normalizedQuery === "chennaidistrict") {
    return {
      ...base,
      status: "taluk" as ChennaiRevenueResolverStatus,
      explanation: "Chennai District currently contains 144 rows in MITO's preferred official source table; the official source conflict remains unresolved.",
      matches: chennaiRevenueUnits,
    };
  }

  const exactVillageMatches = chennaiRevenueUnits.filter((unit) => normalizeChennaiSearchTerm(unit.name) === normalizedQuery);
  if (exactVillageMatches.length) {
    const exactMatch = exactVillageMatches.length === 1 ? exactVillageMatches[0] : null;
    return {
      ...base,
      status: exactVillageMatches.length === 1 ? "matched" as ChennaiRevenueResolverStatus : "ambiguous" as ChennaiRevenueResolverStatus,
      explanation: exactMatch
        ? exactMatch.registrationCrosswalkStatus === "verified"
          ? "Exact source-table match with an independently verified registration crosswalk. Current values and geometry remain unavailable."
          : exactMatch.registrationCrosswalkStatus === "ambiguous"
            ? "Exact source-table match, but the candidate registration village covers multiple revenue subdivisions. MITO keeps the crosswalk unresolved."
            : "Exact source-table village-name match. Registration jurisdiction, Tamil alias and geometry remain unverified."
        : "This official source name occurs in more than one taluk. Choose the taluk explicitly; MITO will not merge the rows.",
      matches: exactVillageMatches,
    };
  }

  const exactTaluk = chennaiRevenue.taluks.find((taluk) => normalizeChennaiSearchTerm(taluk.sourceName) === normalizedQuery);
  if (exactTaluk) {
    const matches = chennaiRevenueUnits.filter((unit) => unit.talukSequence === exactTaluk.sequence);
    return {
      ...base,
      status: "taluk" as ChennaiRevenueResolverStatus,
      explanation: `${exactTaluk.sourceName} has ${matches.length} village rows in the preferred official source table.`,
      matches,
    };
  }

  if (normalizedQuery.length >= 3) {
    const partialMatches = chennaiRevenueUnits.filter((unit) =>
      normalizeChennaiSearchTerm(unit.name).includes(normalizedQuery)
      || normalizeChennaiSearchTerm(unit.talukName).includes(normalizedQuery),
    );
    if (partialMatches.length) {
      return {
        ...base,
        status: partialMatches.length === 1 ? "partial" as ChennaiRevenueResolverStatus : "ambiguous" as ChennaiRevenueResolverStatus,
        explanation: partialMatches.length === 1
          ? "Partial source-table name match; confirm the taluk and future registration crosswalk before relying on it."
          : "The text matches multiple source rows. Choose a specific village and taluk.",
        matches: partialMatches,
      };
    }
  }

  return {
    ...base,
    status: "none" as ChennaiRevenueResolverStatus,
    explanation: "No verified Chennai District source-table match. MITO will not infer a village from an unfamiliar locality name.",
    matches: [],
  };
}

export const chennaiRevenueCoverage = chennaiRevenue;
export const chennaiGeometrySourceAudit = geometrySourceAudit;
export const chennaiRegistrationCrosswalk = registrationCrosswalk;

export const chennaiTalukCrosswalkProgress = chennaiRevenue.taluks.map((taluk) => {
  const units = chennaiRevenueUnits.filter((unit) => unit.talukSequence === taluk.sequence);
  return {
    talukSequence: taluk.sequence,
    talukName: taluk.sourceName,
    sourceVillageCount: units.length,
    verifiedCrosswalkCount: units.filter((unit) => unit.registrationCrosswalkStatus === "verified").length,
    ambiguousCrosswalkCount: units.filter((unit) => unit.registrationCrosswalkStatus === "ambiguous").length,
  };
});

const verifiedCrosswalkUnits = chennaiRevenueUnits.filter(
  (unit) => unit.registrationCrosswalkStatus === "verified" && unit.registrationCrosswalk !== null,
);

export const chennaiRevenueSummary = {
  talukGroupCount: chennaiRevenue.taluks.length,
  sourceVillageCount: chennaiRevenueUnits.length,
  firkaCount: chennaiRevenue.taluks.reduce((sum, taluk) => sum + taluk.firkaCount, 0),
  registrationCrosswalkCount: verifiedCrosswalkUnits.length,
  ambiguousRegistrationCrosswalkCount: chennaiRevenueUnits.filter((unit) => unit.registrationCrosswalkStatus === "ambiguous").length,
  taluksWithVerifiedCrosswalks: chennaiTalukCrosswalkProgress.filter((taluk) => taluk.verifiedCrosswalkCount > 0).length,
  crosswalkCoveragePercent: Number(((verifiedCrosswalkUnits.length / chennaiRevenueUnits.length) * 100).toFixed(2)),
  currentInventoryMetadataCount: verifiedCrosswalkUnits.length,
  currentInventoryItemCount: verifiedCrosswalkUnits.reduce(
    (sum, unit) => sum + (unit.registrationCrosswalk?.currentInventoryItemCount ?? 0),
    0,
  ),
  officialGuidelineValueCount: 0,
  registeredTransactionCount: 0,
  plottedGeometryCount: 0,
  authoritativeRoadFeaturesDiscovered: geometrySourceAudit.summary.officialRoadFeaturesDiscovered,
  authoritativeWardPolygonsDiscovered: geometrySourceAudit.summary.officialWardPolygonsDiscovered,
  authoritativeZonePolygonsDiscovered: geometrySourceAudit.summary.officialZonePolygonsDiscovered,
  publishableAuthoritativeGeometryCount: geometrySourceAudit.summary.officialGeometryFeaturesPublished,
  geometryPermissionGatedSourceCount: geometrySourceAudit.summary.permissionGatedSources,
  conflictCount: chennaiRevenue.conflicts.filter((conflict) => conflict.status === "unresolved").length,
};
