import coverage from "./coverage/omr-corridor.json";
import placeAliases from "./evidence/omr-place-aliases.json";
import {
  archivedGuidelineRecordsForVillage,
  officialAllotmentRatesForVillage,
  officialAuctionReservePricesForVillage,
  officialCommercialAuctionReservesForVillage,
  officialSecuredCreditorLandReservesForVillage,
  navalurResidentialLandReservesForVillage,
  omrGuidelineOmrInventoryAudit,
  omrGuidelineSnapshotSummary,
  omrOfficialAllotmentRateSummary,
  omrOfficialAuctionReservePriceSummary,
  omrOfficialCommercialAuctionReserveSummary,
  omrOfficialSecuredCreditorLandReserveSummary,
  omrNavalurResidentialLandReserveSummary,
  omrOfficialUnresolvedThaiyurLandReserveSummary,
  omrSemmancheriAcceptedLandBidOutcomeSummary,
  omrPlanningSummary,
  omrTnhbHousingOfferLedger,
  omrTnhbHousingOfferSummary,
  planningRecordsForVillage,
  semmancheriAcceptedLandBidPricesForVillage,
  tnhbHousingOffersForCandidateVillage,
  unresolvedThaiyurLandReservesForCandidateVillage,
} from "./evidence";

export type OmrCoverageStatus = "not_started" | "collecting" | "captured" | "verified" | "blocked";

export type OmrCoverageUnit = (typeof coverage.units)[number];
export type OmrRegistrationOffice = (typeof coverage.registrationOffices)[number];

const units = coverage.units as OmrCoverageUnit[];
const unitByKey = new Map(units.map((unit) => [`${unit.officialSroCode}:${unit.officialVillageCode}`, unit]));
const officeByCode = new Map(coverage.registrationOffices.map((office) => [office.officialSroCode, office]));
const inventoryByKey = new Map(
  omrGuidelineOmrInventoryAudit.queries.map((query) => [`${query.officialSroCode}:${query.officialVillageCode}`, query]),
);

export type OmrResolverStatus = "empty" | "matched" | "ambiguous" | "office" | "partial" | "scope" | "unresolved" | "none";
export type OmrResolverConfidence = "exact" | "variant" | "multiple" | "none";

export function normalizeOmrSearchTerm(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[\s\-_.(),/]+/g, "")
    .trim();
}

function resolverMatch(
  key: string,
  matchedAlias: string,
  matchBasis: "official_code" | "unit_alias" | "office_alias" | "partial_alias" | "scope",
  aliasType: string | null = null,
) {
  const unit = unitByKey.get(key);
  if (!unit) return null;
  return {
    key,
    matchedAlias,
    matchBasis,
    aliasType,
    unit,
    office: officeByCode.get(unit.officialSroCode) ?? null,
    inventoryQuery: inventoryByKey.get(key) ?? null,
  };
}

function matchesForKeys(
  keys: string[],
  matchedAlias: string,
  matchBasis: "official_code" | "unit_alias" | "office_alias" | "partial_alias" | "scope",
  aliasType: string | null = null,
) {
  return keys.map((key) => resolverMatch(key, matchedAlias, matchBasis, aliasType)).filter((match) => match !== null);
}

export function resolveOmrPlace(input: string) {
  const query = input.trim();
  const normalizedQuery = normalizeOmrSearchTerm(query);
  const base = { query, normalizedQuery };

  if (!normalizedQuery) {
    return { ...base, status: "empty" as OmrResolverStatus, confidence: "none" as OmrResolverConfidence, explanation: "Enter a village, Tamil name, TNREGINET spelling, SRO or official ID.", matches: [] };
  }

  if (normalizedQuery === "omr") {
    return {
      ...base,
      status: "scope" as OmrResolverStatus,
      confidence: "multiple" as OmrResolverConfidence,
      explanation: "OMR is the complete 24-village pilot scope, not one registration jurisdiction.",
      matches: matchesForKeys(units.map((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}`), query, "scope"),
    };
  }

  const excluded = placeAliases.excludedTerms.find((term) => normalizeOmrSearchTerm(term.value) === normalizedQuery);
  if (excluded) {
    return {
      ...base,
      status: "unresolved" as OmrResolverStatus,
      confidence: "none" as OmrResolverConfidence,
      explanation: excluded.reason,
      matches: [],
      candidateVillageKeys: excluded.candidateVillageKeys,
    };
  }

  const ambiguous = placeAliases.ambiguousTerms.find((term) => normalizeOmrSearchTerm(term.value) === normalizedQuery);
  if (ambiguous) {
    return {
      ...base,
      status: "ambiguous" as OmrResolverStatus,
      confidence: "multiple" as OmrResolverConfidence,
      explanation: ambiguous.reason,
      matches: matchesForKeys(ambiguous.candidateVillageKeys, ambiguous.value, "unit_alias"),
    };
  }

  const combinedCode = units.find((unit) => normalizeOmrSearchTerm(`${unit.officialSroCode}:${unit.officialVillageCode}`) === normalizedQuery);
  const villageCode = combinedCode ?? units.find((unit) => unit.officialVillageCode === query);
  if (villageCode) {
    const key = `${villageCode.officialSroCode}:${villageCode.officialVillageCode}`;
    return {
      ...base,
      status: "matched" as OmrResolverStatus,
      confidence: "exact" as OmrResolverConfidence,
      explanation: "Exact official registration-village identifier match.",
      matches: matchesForKeys([key], query, "official_code"),
    };
  }

  const exactAliases = placeAliases.unitAliases.flatMap((entry) =>
    entry.aliases
      .filter((alias) => normalizeOmrSearchTerm(alias.value) === normalizedQuery)
      .map((alias) => ({ entry, alias })),
  );
  if (exactAliases.length) {
    const unique = [...new Map(exactAliases.map(({ entry, alias }) => [`${entry.officialSroCode}:${entry.officialVillageCode}`, { entry, alias }])).values()];
    const matches = unique
      .map(({ entry, alias }) => resolverMatch(`${entry.officialSroCode}:${entry.officialVillageCode}`, alias.value, "unit_alias", alias.type))
      .filter((match) => match !== null);
    const isCanonical = unique.every(({ alias }) => alias.type !== "tnreginet_label");
    return {
      ...base,
      status: matches.length === 1 ? "matched" as OmrResolverStatus : "ambiguous" as OmrResolverStatus,
      confidence: matches.length === 1 ? (isCanonical ? "exact" as OmrResolverConfidence : "variant" as OmrResolverConfidence) : "multiple" as OmrResolverConfidence,
      explanation: matches.length === 1
        ? isCanonical ? "Exact MITO coverage-name match." : "Matched a spelling used by the current TNREGINET selector."
        : "The name matches more than one registration village.",
      matches,
    };
  }

  const office = placeAliases.officeAliases.find(
    (entry) => entry.officialSroCode === query || entry.aliases.some((alias) => normalizeOmrSearchTerm(alias) === normalizedQuery),
  );
  if (office) {
    const officeUnits = units.filter((unit) => unit.officialSroCode === office.officialSroCode);
    return {
      ...base,
      status: "office" as OmrResolverStatus,
      confidence: "multiple" as OmrResolverConfidence,
      explanation: `This is a Sub Registrar Office covering ${officeUnits.length} MITO pilot villages. Select the exact registration village.`,
      matches: matchesForKeys(officeUnits.map((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}`), query, "office_alias"),
    };
  }

  if (normalizedQuery.length >= 3) {
    const partialKeys = new Map<string, { value: string; type: string }>();
    for (const entry of placeAliases.unitAliases) {
      for (const alias of entry.aliases) {
        const normalizedAlias = normalizeOmrSearchTerm(alias.value);
        if (normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias)) {
          partialKeys.set(`${entry.officialSroCode}:${entry.officialVillageCode}`, alias);
        }
      }
    }
    if (partialKeys.size) {
      const matches = [...partialKeys.entries()]
        .map(([key, alias]) => resolverMatch(key, alias.value, "partial_alias", alias.type))
        .filter((match) => match !== null);
      return {
        ...base,
        status: matches.length === 1 ? "partial" as OmrResolverStatus : "ambiguous" as OmrResolverStatus,
        confidence: matches.length === 1 ? "variant" as OmrResolverConfidence : "multiple" as OmrResolverConfidence,
        explanation: matches.length === 1 ? "Partial deterministic alias match; confirm the official IDs before relying on it." : "The text matches multiple registration villages; choose one explicitly.",
        matches,
      };
    }
  }

  return {
    ...base,
    status: "none" as OmrResolverStatus,
    confidence: "none" as OmrResolverConfidence,
    explanation: "No verified OMR registration-jurisdiction match. MITO will not guess a village from an unfamiliar place name.",
    matches: [],
  };
}

export function aliasesForVillage(officialSroCode: string, officialVillageCode: string) {
  return placeAliases.unitAliases.find(
    (entry) => entry.officialSroCode === officialSroCode && entry.officialVillageCode === officialVillageCode,
  )?.aliases ?? [];
}

export const omrPlaceAliasLedger = placeAliases;

export const omrCoverage = coverage;

export const omrVillageEvidenceMatrix = units.map((unit) => {
  const key = `${unit.officialSroCode}:${unit.officialVillageCode}`;
  const inventory = inventoryByKey.get(key) ?? null;
  const planningRecords = planningRecordsForVillage(unit.officialSroCode, unit.officialVillageCode);
  const archivedGuidelineRecords = archivedGuidelineRecordsForVillage(unit.officialSroCode, unit.officialVillageCode);
  const governmentAllotmentRates = officialAllotmentRatesForVillage(unit.officialSroCode, unit.officialVillageCode);
  const officialAuctionReservePrices = officialAuctionReservePricesForVillage(unit.officialSroCode, unit.officialVillageCode);
  const officialCommercialAuctionReserves = officialCommercialAuctionReservesForVillage(unit.officialSroCode, unit.officialVillageCode);
  const officialSecuredCreditorLandReserves = officialSecuredCreditorLandReservesForVillage(unit.officialSroCode, unit.officialVillageCode);
  const navalurResidentialLandReserves = navalurResidentialLandReservesForVillage(unit.officialSroCode, unit.officialVillageCode);
  const unresolvedThaiyurLandReserves = unresolvedThaiyurLandReservesForCandidateVillage(unit.officialSroCode, unit.officialVillageCode);
  const acceptedLandBidPrices = semmancheriAcceptedLandBidPricesForVillage(unit.officialSroCode, unit.officialVillageCode);
  const unresolvedHousingOffers = tnhbHousingOffersForCandidateVillage(unit.officialSroCode, unit.officialVillageCode);
  const tnhbPlaceMatched = omrTnhbHousingOfferLedger.omrScopeAudit.matchedCandidateVillageKeys.includes(key);
  const availableEvidenceTypes = ["current_guideline_inventory_metadata"];

  if (planningRecords.length) availableEvidenceTypes.push("official_planning_records");
  if (archivedGuidelineRecords.length) availableEvidenceTypes.push("archived_guideline_value");
  if (governmentAllotmentRates.length) availableEvidenceTypes.push("government_leasehold_allotment_rates");
  if (officialAuctionReservePrices.length) availableEvidenceTypes.push("official_liquidation_auction_reserve_price");
  if (officialCommercialAuctionReserves.length) availableEvidenceTypes.push("official_liquidation_combined_asset_reserve_history");
  if (officialSecuredCreditorLandReserves.length) availableEvidenceTypes.push("official_secured_creditor_land_reserve_history");
  if (navalurResidentialLandReserves.length) availableEvidenceTypes.push("document_backed_secured_creditor_residential_land_reserve_checkpoints");
  if (unresolvedThaiyurLandReserves.length) availableEvidenceTypes.push("unresolved_official_land_auction_reserve_price");
  if (acceptedLandBidPrices.length) availableEvidenceTypes.push("tribunal_verified_auction_reserve_and_accepted_bid_outcome");
  if (unresolvedHousingOffers.length) availableEvidenceTypes.push("unresolved_official_housing_prices");
  if (governmentAllotmentRates.length && omrOfficialAllotmentRateSummary.sharedPublishableGeometryCount) {
    availableEvidenceTypes.push("approximate_open_data_geometry");
  }

  const primaryBlockers = [
    "Authorized current row-level guideline values are not captured.",
    "No verified registered land transactions are published.",
    "No exact parcel, street-segment or cadastral geometry is published.",
  ];
  if (tnhbPlaceMatched) primaryBlockers.push("TNHB's Sholinganallur place label is unresolved between registration villages 1 and 2.");
  if (officialAuctionReservePrices.length) primaryBlockers.push("The concluded liquidation auction's winning bid and registered transfer are not published.");
  if (officialCommercialAuctionReserves.length) primaryBlockers.push("The Siruseri auction outcome and asset-to-registration-polygon crosswalk are not published.");
  if (officialSecuredCreditorLandReserves.length) primaryBlockers.push("The Semmancheri auction outcome, registered transfer and parcel boundary are not published.");
  if (navalurResidentialLandReserves.length) primaryBlockers.push("The Navalur documents establish only two historical reserve checkpoints; the complete reserve history, outcome, current status and parcel geometry are not published.");
  if (unresolvedThaiyurLandReserves.length) primaryBlockers.push("The Repco notice does not resolve Thaiyur A versus B, and its auction outcome and transfer are unpublished.");
  if (acceptedLandBidPrices.length) primaryBlockers.push("The Semmancheri accepted bid was cancelled after the unpaid balance and did not become a completed or registered sale.");

  return {
    key,
    nameEn: unit.nameEn,
    nameTa: unit.nameTa,
    officialSroCode: unit.officialSroCode,
    officialVillageCode: unit.officialVillageCode,
    currentGuidelineRegister: {
      status: inventory ? "verified_metadata_only" : "not_audited",
      displayedItemCount: inventory?.displayedItemCount ?? 0,
      currentPublishedValueCount: unit.officialGuidelineRecords,
      blocker: "REDISTRIBUTION_PERMISSION_REQUIRED",
    },
    planning: {
      status: planningRecords.length ? "direct_records_found" : "no_direct_record_in_ledger",
      directRecordCount: planningRecords.length,
    },
    archivedGuideline: {
      status: archivedGuidelineRecords.length ? "historical_record_found" : "no_archived_record_in_ledger",
      recordCount: archivedGuidelineRecords.length,
      currentVerifiedCount: 0,
    },
    governmentAllotment: {
      status: governmentAllotmentRates.length ? "named_park_association" : "no_named_park_association",
      recordCount: governmentAllotmentRates.length,
    },
    officialAuctionReservePrices: {
      status: officialAuctionReservePrices.length ? "direct_reserve_price_record_found" : "no_direct_record_in_ledger",
      recordCount: officialAuctionReservePrices.length,
      directRecordCount: officialAuctionReservePrices.length,
      lifecycleStatus: officialAuctionReservePrices[0]?.lifecycleStatus ?? null,
      derivedReservePriceRangeInrPerSqft: officialAuctionReservePrices[0]?.derivedReservePriceRangeInrPerSqft ?? null,
      registeredTransactionCount: 0,
      winningBidRecordCount: 0,
    },
    officialCommercialAuctionReserves: {
      status: officialCommercialAuctionReserves.length ? "named_park_reserve_history_found" : "no_named_park_record_in_ledger",
      recordCount: officialCommercialAuctionReserves.length,
      assetCount: officialCommercialAuctionReserves.length ? 1 : 0,
      directRecordCount: 0,
      namedParkAssociationCount: officialCommercialAuctionReserves.length ? 1 : 0,
      lifecycleStatus: officialCommercialAuctionReserves.at(-1)?.lifecycleStatus ?? null,
      reservePriceRangeInr: officialCommercialAuctionReserves.length ? omrOfficialCommercialAuctionReserveSummary.reservePriceRangeInr : null,
      derivedCombinedReserveRangeInrPerBuildingSqft: officialCommercialAuctionReserves.length
        ? omrOfficialCommercialAuctionReserveSummary.derivedCombinedReserveRangeInrPerBuildingSqft
        : null,
      landReservePriceRecordCount: 0,
      registeredTransactionCount: 0,
      winningBidRecordCount: 0,
    },
    officialSecuredCreditorLandReserves: {
      status: officialSecuredCreditorLandReserves.length ? "direct_land_reserve_history_found" : "no_direct_record_in_ledger",
      recordCount: officialSecuredCreditorLandReserves.length,
      assetCount: officialSecuredCreditorLandReserves.length ? 1 : 0,
      directRecordCount: officialSecuredCreditorLandReserves.length,
      lifecycleStatus: officialSecuredCreditorLandReserves.length ? omrOfficialSecuredCreditorLandReserveSummary.currentLifecycleStatus : null,
      lifecycleAsOf: officialSecuredCreditorLandReserves.length ? omrOfficialSecuredCreditorLandReserveSummary.currentLifecycleAsOf : null,
      reservePriceRangeInr: officialSecuredCreditorLandReserves.length ? omrOfficialSecuredCreditorLandReserveSummary.reservePriceRangeInr : null,
      derivedLandReserveRangeInrPerSqft: officialSecuredCreditorLandReserves.length
        ? omrOfficialSecuredCreditorLandReserveSummary.derivedLandReserveRangeInrPerSqft
        : null,
      sourcePublishedPointCount: officialSecuredCreditorLandReserves.length ? omrOfficialSecuredCreditorLandReserveSummary.sourcePublishedPointCount : 0,
      exactParcelGeometryCount: 0,
      registeredTransactionCount: 0,
      winningBidRecordCount: 0,
    },
    navalurResidentialLandReserves: {
      status: navalurResidentialLandReserves.length ? "direct_document_backed_reserve_checkpoints_found" : "no_direct_record_in_ledger",
      recordCount: navalurResidentialLandReserves.length,
      assetCount: navalurResidentialLandReserves.length ? 1 : 0,
      directRecordCount: navalurResidentialLandReserves.length,
      lifecycleStatus: navalurResidentialLandReserves.length ? omrNavalurResidentialLandReserveSummary.currentLifecycleStatus : null,
      lifecycleAsOf: navalurResidentialLandReserves.length ? omrNavalurResidentialLandReserveSummary.currentLifecycleAsOf : null,
      reservePriceRangeInr: navalurResidentialLandReserves.length ? omrNavalurResidentialLandReserveSummary.reservePriceRangeInr : null,
      derivedLandReserveRangeInrPerSqft: navalurResidentialLandReserves.length
        ? omrNavalurResidentialLandReserveSummary.derivedLandReserveRangeInrPerSqft
        : null,
      verifiedCheckpointReductionPercent: navalurResidentialLandReserves.length
        ? omrNavalurResidentialLandReserveSummary.verifiedCheckpointReductionPercent
        : null,
      completeReserveHistoryVerified: navalurResidentialLandReserves.length
        ? omrNavalurResidentialLandReserveSummary.completeReserveHistoryVerified
        : false,
      unnormalizedSecondaryClaimCount: navalurResidentialLandReserves.length
        ? omrNavalurResidentialLandReserveSummary.unnormalizedSecondaryClaimCount
        : 0,
      currentOfficialFeedTargetMatchCount: navalurResidentialLandReserves.length
        ? omrNavalurResidentialLandReserveSummary.officialCurrentFeedTargetMatchCount
        : 0,
      registeredTransactionCount: 0,
      completedSaleRecordCount: 0,
      winningBidRecordCount: 0,
      plottedRecordCount: 0,
    },
    officialUnresolvedThaiyurLandReserve: {
      status: unresolvedThaiyurLandReserves.length ? "unresolved_registration_subdivision" : "no_candidate_record_in_ledger",
      recordCount: unresolvedThaiyurLandReserves.length,
      assetCount: unresolvedThaiyurLandReserves.length ? 1 : 0,
      directRecordCount: 0,
      candidateAssociationCount: unresolvedThaiyurLandReserves.length ? 1 : 0,
      lifecycleStatus: unresolvedThaiyurLandReserves[0]?.lifecycleStatus ?? null,
      totalReservePriceInr: unresolvedThaiyurLandReserves[0]?.totalReservePriceInr ?? null,
      derivedReservePriceInrPerSqft: unresolvedThaiyurLandReserves[0]?.derivedReservePriceInrPerSqft ?? null,
      registeredTransactionCount: 0,
      winningBidRecordCount: 0,
      plottedRecordCount: 0,
    },
    officialAcceptedLandBidOutcome: {
      status: acceptedLandBidPrices.length ? "accepted_bid_cancelled_no_completed_sale" : "no_record_in_ledger",
      priceObservationCount: acceptedLandBidPrices.length,
      assetCount: acceptedLandBidPrices.length ? 1 : 0,
      directRecordCount: acceptedLandBidPrices.length,
      landReservePriceRecordCount: acceptedLandBidPrices.filter((record) => record.isLandReservePrice).length,
      acceptedBidRecordCount: acceptedLandBidPrices.filter((record) => record.isAcceptedBid).length,
      completedSaleRecordCount: 0,
      registeredTransactionCount: 0,
      reservePriceInr: acceptedLandBidPrices.length ? omrSemmancheriAcceptedLandBidOutcomeSummary.reservePriceInr : null,
      acceptedBidInr: acceptedLandBidPrices.length ? omrSemmancheriAcceptedLandBidOutcomeSummary.acceptedBidInr : null,
      acceptedBidDerivedInrPerSqft: acceptedLandBidPrices.length ? omrSemmancheriAcceptedLandBidOutcomeSummary.acceptedBidDerivedInrPerSqft : null,
      lifecycleStatus: acceptedLandBidPrices.length ? omrSemmancheriAcceptedLandBidOutcomeSummary.outcomeStatus : null,
      plottedRecordCount: 0,
    },
    tnhbPublicSales: {
      status: tnhbPlaceMatched ? "unresolved_locality_match" : "no_normalized_place_name_match_in_snapshot",
      sourceSnapshotRecordCount: omrTnhbHousingOfferLedger.omrScopeAudit.sourceRecordCountScanned,
      unresolvedRecordCount: unresolvedHousingOffers.length,
      directRecordCount: 0,
      auditedAt: omrTnhbHousingOfferLedger.auditedAt,
      caveat: tnhbPlaceMatched
        ? "The source label does not identify which Sholinganallur registration subdivision applies."
        : "No normalized place-name match is an audited source result, not proof that TNHB owns no property or never operated a scheme here.",
    },
    registeredTransactions: {
      status: "no_records_in_mito",
      recordCount: unit.registeredTransactionRecords,
    },
    geometry: {
      publishableApproximateCount: governmentAllotmentRates.length ? omrOfficialAllotmentRateSummary.sharedPublishableGeometryCount : 0,
      sourcePublishedPointCount: officialSecuredCreditorLandReserves.length ? omrOfficialSecuredCreditorLandReserveSummary.sourcePublishedPointCount : 0,
      exactCount: 0,
    },
    publishedLandMarketValue: {
      status: "insufficient_evidence",
      published: false,
    },
    availableEvidenceTypes,
    primaryBlockers,
  };
});

export const omrCoverageSummary = {
  unitCount: units.length,
  officeCount: coverage.registrationOffices.length,
  jurisdictionVerifiedCount: units.filter((unit) => unit.jurisdictionStatus === "verified").length,
  currentStreetInventoryVerifiedCount: units.filter(
    (unit) => "streetTargetEvidenceStatus" in unit && unit.streetTargetEvidenceStatus === "live_official_metadata",
  ).length,
  currentOfficialInventoryItemCount: units.reduce((sum, unit) => sum + (unit.streetTargetCount ?? 0), 0),
  streetRegisterVerifiedCount: units.filter((unit) => unit.streetRegisterStatus === "verified").length,
  officialGuidelineRecordCount: units.reduce((sum, unit) => sum + unit.officialGuidelineRecords, 0),
  archivedGuidelineRecordCount: omrGuidelineSnapshotSummary.recordCount,
  pendingGuidelineRecheckCount: omrGuidelineSnapshotSummary.pendingLiveRecheckCount,
  registeredTransactionRecordCount: units.reduce((sum, unit) => sum + unit.registeredTransactionRecords, 0),
  officialAllotmentRateCount: omrOfficialAllotmentRateSummary.recordCount,
  officialAllotmentRateVillageCount: omrOfficialAllotmentRateSummary.villageAssociationCount,
  officialAuctionReservePriceCount: omrOfficialAuctionReservePriceSummary.recordCount,
  officialAuctionReservePriceVillageCount: omrOfficialAuctionReservePriceSummary.directVillageLinkCount,
  officialAuctionWinningBidRecordCount: omrOfficialAuctionReservePriceSummary.winningBidRecordCount,
  officialCommercialAuctionReserveCount: omrOfficialCommercialAuctionReserveSummary.recordCount,
  officialCommercialAuctionAssetCount: omrOfficialCommercialAuctionReserveSummary.assetCount,
  officialCommercialAuctionNamedParkAssociationCount: omrOfficialCommercialAuctionReserveSummary.namedParkAssociationCount,
  officialCommercialAuctionDirectVillageLinkCount: omrOfficialCommercialAuctionReserveSummary.directVillageLinkCount,
  officialCommercialAuctionWinningBidRecordCount: omrOfficialCommercialAuctionReserveSummary.winningBidRecordCount,
  officialSecuredCreditorLandReserveCount: omrOfficialSecuredCreditorLandReserveSummary.recordCount,
  officialSecuredCreditorLandReserveAssetCount: omrOfficialSecuredCreditorLandReserveSummary.assetCount,
  officialSecuredCreditorLandReserveVillageCount: omrOfficialSecuredCreditorLandReserveSummary.directVillageLinkCount,
  officialSecuredCreditorLandReserveWinningBidRecordCount: omrOfficialSecuredCreditorLandReserveSummary.winningBidRecordCount,
  navalurResidentialLandReserveCount: omrNavalurResidentialLandReserveSummary.recordCount,
  navalurResidentialLandReserveAssetCount: omrNavalurResidentialLandReserveSummary.assetCount,
  navalurResidentialLandReserveVillageCount: omrNavalurResidentialLandReserveSummary.directVillageLinkCount,
  navalurResidentialLandReserveWinningBidRecordCount: omrNavalurResidentialLandReserveSummary.winningBidRecordCount,
  navalurResidentialLandReserveRegisteredTransactionCount: omrNavalurResidentialLandReserveSummary.registeredTransactionCount,
  navalurResidentialLandReserveUnnormalizedSecondaryClaimCount: omrNavalurResidentialLandReserveSummary.unnormalizedSecondaryClaimCount,
  officialUnresolvedThaiyurLandReserveCount: omrOfficialUnresolvedThaiyurLandReserveSummary.recordCount,
  officialUnresolvedThaiyurLandReserveAssetCount: omrOfficialUnresolvedThaiyurLandReserveSummary.assetCount,
  officialUnresolvedThaiyurCandidateVillageCount: omrOfficialUnresolvedThaiyurLandReserveSummary.candidateVillageCount,
  officialUnresolvedThaiyurDirectVillageLinkCount: omrOfficialUnresolvedThaiyurLandReserveSummary.directVillageLinkCount,
  officialUnresolvedThaiyurWinningBidRecordCount: omrOfficialUnresolvedThaiyurLandReserveSummary.winningBidRecordCount,
  officialAcceptedLandBidPriceObservationCount: omrSemmancheriAcceptedLandBidOutcomeSummary.priceObservationCount,
  officialAcceptedLandBidAssetCount: omrSemmancheriAcceptedLandBidOutcomeSummary.assetCount,
  officialAcceptedLandBidVillageCount: omrSemmancheriAcceptedLandBidOutcomeSummary.directVillageLinkCount,
  officialAcceptedLandBidRecordCount: omrSemmancheriAcceptedLandBidOutcomeSummary.acceptedBidRecordCount,
  officialAcceptedLandBidCompletedSaleCount: omrSemmancheriAcceptedLandBidOutcomeSummary.completedSaleRecordCount,
  officialAcceptedLandBidRegisteredTransactionCount: omrSemmancheriAcceptedLandBidOutcomeSummary.registeredTransactionCount,
  sourcePublishedAssetPointCount: omrOfficialSecuredCreditorLandReserveSummary.sourcePublishedPointCount,
  officialHousingOfferCount: omrTnhbHousingOfferSummary.recordCount,
  closedOfficialHousingOfferCount: omrTnhbHousingOfferSummary.closedOfferCount,
  directHousingOfferVillageCount: omrTnhbHousingOfferSummary.directVillageLinkCount,
  publishableApproximateGeometryCount: omrOfficialAllotmentRateSummary.sharedPublishableGeometryCount,
  exactEvidenceGeometryCount: omrOfficialAllotmentRateSummary.exactGeometryCount,
  officialEvidenceGeometryPublishedCount: omrOfficialAllotmentRateSummary.officialGeometryPublishedCount,
  officialPlanningRecordCount: omrPlanningSummary.recordCount,
  planningVillageCount: omrPlanningSummary.villageCount,
  unresolvedPlanningRecordCount: omrPlanningSummary.unresolvedRecordCount,
  unplottedCount: units.filter((unit) => unit.geometryStatus === "unplotted").length,
};

export const omrCoveragePercent = {
  jurisdiction: Math.round((omrCoverageSummary.jurisdictionVerifiedCount / omrCoverageSummary.unitCount) * 100),
  currentInventory: Math.round((omrCoverageSummary.currentStreetInventoryVerifiedCount / omrCoverageSummary.unitCount) * 100),
  streetRegister: Math.round((omrCoverageSummary.streetRegisterVerifiedCount / omrCoverageSummary.unitCount) * 100),
  planning: Math.round((omrCoverageSummary.planningVillageCount / omrCoverageSummary.unitCount) * 100),
};

export const omrCoverageByOffice = coverage.registrationOffices.map((office) => ({
  ...office,
  units: units.filter((unit) => unit.officialSroCode === office.officialSroCode),
}));

export const omrReleaseReady =
  omrCoverageSummary.jurisdictionVerifiedCount === omrCoverageSummary.unitCount &&
  omrCoverageSummary.streetRegisterVerifiedCount === omrCoverageSummary.unitCount &&
  units.every(
    (unit) =>
      unit.streetTargetCount !== null &&
      unit.officialGuidelineRecords >= coverage.releaseGate.minimumOfficialGuidelineRecordsPerUnit &&
      Boolean(unit.verifiedAt),
  );
