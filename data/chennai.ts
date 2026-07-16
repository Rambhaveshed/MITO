import chennaiRevenue from "./coverage/chennai-district-revenue-2026-07-16.json";

export type ChennaiRevenueTaluk = (typeof chennaiRevenue.taluks)[number];

export type ChennaiRevenueUnit = {
  key: string;
  sequence: number;
  name: string;
  talukSequence: number;
  talukName: string;
  firkaCount: number;
  sourceStatus: "official_source_listed";
  registrationCrosswalkStatus: "not_started";
  geometryStatus: "unplotted";
  officialGuidelineValues: 0;
  registeredTransactions: 0;
};

export function normalizeChennaiSearchTerm(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[\s\-_.(),/]+/g, "")
    .trim();
}

export const chennaiRevenueUnits: ChennaiRevenueUnit[] = chennaiRevenue.taluks.flatMap((taluk) =>
  taluk.villages.map((name, index) => ({
    key: `${taluk.sequence}:${index + 1}`,
    sequence: index + 1,
    name,
    talukSequence: taluk.sequence,
    talukName: taluk.sourceName,
    firkaCount: taluk.firkaCount,
    sourceStatus: "official_source_listed" as const,
    registrationCrosswalkStatus: "not_started" as const,
    geometryStatus: "unplotted" as const,
    officialGuidelineValues: 0 as const,
    registeredTransactions: 0 as const,
  })),
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
    return {
      ...base,
      status: exactVillageMatches.length === 1 ? "matched" as ChennaiRevenueResolverStatus : "ambiguous" as ChennaiRevenueResolverStatus,
      explanation: exactVillageMatches.length === 1
        ? "Exact source-table village-name match. Registration jurisdiction, Tamil alias and geometry remain unverified."
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

export const chennaiRevenueSummary = {
  talukGroupCount: chennaiRevenue.taluks.length,
  sourceVillageCount: chennaiRevenueUnits.length,
  firkaCount: chennaiRevenue.taluks.reduce((sum, taluk) => sum + taluk.firkaCount, 0),
  registrationCrosswalkCount: 0,
  officialGuidelineValueCount: 0,
  registeredTransactionCount: 0,
  plottedGeometryCount: 0,
  conflictCount: chennaiRevenue.conflicts.filter((conflict) => conflict.status === "unresolved").length,
};
