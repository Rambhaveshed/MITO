import type { FeatureCollection, Polygon } from "geojson";
import captureRun from "./capture-runs/omr-guideline-2026-07-16.json";
import guidelineImportSchema from "./evidence/guideline-value-import.schema.json";
import guidelineSnapshot from "./evidence/omr-guideline-archived-snapshot-2026-07-16.json";
import guidelineSecondaryCorroboration from "./evidence/omr-guideline-secondary-corroboration-2026-07-16.json";
import guidelineLiveRegisterAudit from "./evidence/tnreginet-live-register-audit-2026-07-16.json";
import guidelineOmrInventoryAudit from "./evidence/tnreginet-omr-inventory-audit-2026-07-16.json";
import ibbiSholinganallurLandAuction from "./evidence/ibbi-sholinganallur-land-auction-2025.json";
import ibbiTecproSiruseriCommercialAuctions from "./evidence/ibbi-tecpro-siruseri-commercial-auctions-2022.json";
import planningLedger from "./evidence/omr-planning-records.json";
import sipcotSiruseriGeometryAudit from "./evidence/sipcot-siruseri-geometry-audit-2026-07-17.json";
import sipcotSiruseriLandRates from "./evidence/sipcot-siruseri-land-rates-2026-07-17.json";
import tnhbSholinganallurHousingOffers from "./evidence/tnhb-sholinganallur-housing-offers-2026-07-17.json";
import sipcotSiruseriFootprint from "./geometry/sipcot-siruseri-osm-footprint-2026-07-17.json";

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
export const omrOfficialAllotmentRateLedger = sipcotSiruseriLandRates;
export const omrOfficialAuctionReservePriceLedger = ibbiSholinganallurLandAuction;
export const omrOfficialCommercialAuctionReserveLedger = ibbiTecproSiruseriCommercialAuctions;
export const omrTnhbHousingOfferLedger = tnhbSholinganallurHousingOffers;
export const omrSiruseriGeometryAudit = sipcotSiruseriGeometryAudit;
export const omrSiruseriFootprint = sipcotSiruseriFootprint as FeatureCollection<Polygon>;
export const omrSiruseriFootprintCenter = sipcotSiruseriGeometryAudit.openSource.centroid as [number, number];
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

export const omrOfficialAllotmentRateSummary = {
  recordCount: sipcotSiruseriLandRates.records.length,
  villageAssociationCount: new Set(
    sipcotSiruseriLandRates.records.map(
      () => `${sipcotSiruseriLandRates.location.currentRegistrationAssociation.officialSroCode}:${sipcotSiruseriLandRates.location.currentRegistrationAssociation.officialVillageCode}`,
    ),
  ).size,
  propertyClasses: [...new Set(sipcotSiruseriLandRates.records.map((record) => record.propertyClass))],
  normalizedRateRangeInrPerSqft: {
    low: Math.min(...sipcotSiruseriLandRates.records.map((record) => record.normalizedInrPerSqft)),
    high: Math.max(...sipcotSiruseriLandRates.records.map((record) => record.normalizedInrPerSqft)),
  },
  approximateRecordCount: sipcotSiruseriLandRates.records.filter((record) => record.geometryStatus === "approximate").length,
  sharedPublishableGeometryCount: sipcotSiruseriGeometryAudit.publication.publishableGeometryCount,
  exactGeometryCount: sipcotSiruseriGeometryAudit.publication.exactGeometryCount,
  officialGeometryPublishedCount: sipcotSiruseriGeometryAudit.publication.officialGeometryPublishedCount,
  officialGuidelineValueCount: sipcotSiruseriLandRates.publication.currentOfficialGuidelineValues,
  registeredTransactionCount: sipcotSiruseriLandRates.publication.registeredTransactions,
  verifiedAt: sipcotSiruseriLandRates.auditedAt,
};

export const omrTnhbHousingOfferSummary = {
  recordCount: tnhbSholinganallurHousingOffers.records.length,
  currentOfferCount: tnhbSholinganallurHousingOffers.publication.currentOfferCount,
  closedOfferCount: tnhbSholinganallurHousingOffers.publication.closedOfferCount,
  directVillageLinkCount: tnhbSholinganallurHousingOffers.publication.directVillageLinkCount,
  candidateVillageCount: tnhbSholinganallurHousingOffers.location.candidateVillageKeys.length,
  originalSellingPriceRangeInr: {
    low: Math.min(...tnhbSholinganallurHousingOffers.records.map((record) => record.originalSellingPriceInr)),
    high: Math.max(...tnhbSholinganallurHousingOffers.records.map((record) => record.originalSellingPriceInr)),
  },
  derivedCombinedPriceRangeInrPerPlinthSqft: {
    low: Math.min(...tnhbSholinganallurHousingOffers.records.map((record) => record.derivedCombinedPriceInrPerPlinthSqft)),
    high: Math.max(...tnhbSholinganallurHousingOffers.records.map((record) => record.derivedCombinedPriceInrPerPlinthSqft)),
  },
  plottedRecordCount: tnhbSholinganallurHousingOffers.publication.plottedRecordCount,
  landPriceRecordCount: tnhbSholinganallurHousingOffers.publication.landPriceRecords,
  verifiedAt: tnhbSholinganallurHousingOffers.auditedAt,
};

export const omrOfficialAuctionReservePriceSummary = {
  recordCount: ibbiSholinganallurLandAuction.publication.recordCount,
  directVillageLinkCount: ibbiSholinganallurLandAuction.publication.directVillageLinkCount,
  landReservePriceRecordCount: ibbiSholinganallurLandAuction.publication.landReservePriceRecords,
  registeredTransactionCount: ibbiSholinganallurLandAuction.publication.registeredTransactions,
  winningBidRecordCount: ibbiSholinganallurLandAuction.publication.winningBidRecords,
  plottedRecordCount: ibbiSholinganallurLandAuction.publication.plottedRecordCount,
  lifecycleStatus: ibbiSholinganallurLandAuction.records[0].lifecycleStatus,
  totalReservePriceInr: ibbiSholinganallurLandAuction.records[0].totalReservePriceInr,
  derivedReservePriceRangeInrPerSqft: ibbiSholinganallurLandAuction.records[0].derivedReservePriceRangeInrPerSqft,
  verifiedAt: ibbiSholinganallurLandAuction.auditedAt,
};

export const omrOfficialCommercialAuctionReserveSummary = {
  recordCount: ibbiTecproSiruseriCommercialAuctions.publication.recordCount,
  assetCount: ibbiTecproSiruseriCommercialAuctions.publication.assetCount,
  namedParkAssociationCount: ibbiTecproSiruseriCommercialAuctions.publication.namedParkAssociationCount,
  directVillageLinkCount: ibbiTecproSiruseriCommercialAuctions.publication.directVillageLinkCount,
  combinedLandBuildingReserveRecordCount: ibbiTecproSiruseriCommercialAuctions.publication.combinedLandBuildingReserveRecords,
  landReservePriceRecordCount: ibbiTecproSiruseriCommercialAuctions.publication.landReservePriceRecords,
  registeredTransactionCount: ibbiTecproSiruseriCommercialAuctions.publication.registeredTransactions,
  winningBidRecordCount: ibbiTecproSiruseriCommercialAuctions.publication.winningBidRecords,
  plottedRecordCount: ibbiTecproSiruseriCommercialAuctions.publication.plottedRecordCount,
  reservePriceRangeInr: {
    low: Math.min(...ibbiTecproSiruseriCommercialAuctions.records.map((record) => record.totalReservePriceInr)),
    high: Math.max(...ibbiTecproSiruseriCommercialAuctions.records.map((record) => record.totalReservePriceInr)),
  },
  derivedCombinedReserveRangeInrPerBuildingSqft: {
    low: Math.min(...ibbiTecproSiruseriCommercialAuctions.records.map((record) => record.derivedCombinedReserveInrPerBuildingSqft)),
    high: Math.max(...ibbiTecproSiruseriCommercialAuctions.records.map((record) => record.derivedCombinedReserveInrPerBuildingSqft)),
  },
  reserveReductionPercent: ibbiTecproSiruseriCommercialAuctions.reconciliation.reserveReductionPercent,
  verifiedAt: ibbiTecproSiruseriCommercialAuctions.auditedAt,
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

export function officialAllotmentRatesForVillage(officialSroCode: string, officialVillageCode: string) {
  const association = sipcotSiruseriLandRates.location.currentRegistrationAssociation;
  if (association.officialSroCode !== officialSroCode || association.officialVillageCode !== officialVillageCode) return [];
  return sipcotSiruseriLandRates.records;
}

export function officialAuctionReservePricesForVillage(officialSroCode: string, officialVillageCode: string) {
  const location = ibbiSholinganallurLandAuction.location;
  if (location.officialSroCode !== officialSroCode || location.officialVillageCode !== officialVillageCode) return [];
  return ibbiSholinganallurLandAuction.records;
}

export function officialCommercialAuctionReservesForVillage(officialSroCode: string, officialVillageCode: string) {
  const location = ibbiTecproSiruseriCommercialAuctions.location;
  if (location.officialSroCode !== officialSroCode || location.officialVillageCode !== officialVillageCode) return [];
  return ibbiTecproSiruseriCommercialAuctions.records;
}

export function tnhbHousingOffersForCandidateVillage(officialSroCode: string, officialVillageCode: string) {
  const key = `${officialSroCode}:${officialVillageCode}`;
  if (!tnhbSholinganallurHousingOffers.location.candidateVillageKeys.includes(key)) return [];
  return tnhbSholinganallurHousingOffers.records;
}

export const unresolvedPlanningRecords = planningLedger.records.filter(
  (record) => record.mappingStatus !== "verified",
);
