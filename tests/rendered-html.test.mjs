import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: path.startsWith("/api/") ? "application/json" : "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: {},
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the MITO product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MITO — Tamil Nadu Land Intelligence<\/title>/i);
  assert.match(html, /Tamil Nadu land intelligence/i);
  assert.match(html, /Search village, Tamil name, SRO or ID/i);
  assert.match(html, /Expand to Chennai/i);
  assert.match(html, /24<!-- -->\/<!-- -->24/i);
  assert.match(html, /29(?:<!-- -->)? official planning records captured/i);
  assert.match(html, /1(?:<!-- -->)? archived TNREGINET street row recovered/i);
  assert.match(html, /All current village inventories verified/i);
  assert.match(html, /2,715(?:<!-- -->)? items across/i);
  assert.match(html, /2(?:<!-- -->)? official SIPCOT allotment rates captured/i);
  assert.match(html, /8(?:<!-- -->)? official TNHB residential price records/i);
  assert.match(html, /1(?:<!-- -->)? official liquidation reserve record/i);
  assert.match(html, /2(?:<!-- -->)? Siruseri commercial reserve events/i);
  assert.match(html, /land \+ building, not land rate/i);
  assert.match(html, /reserve price, not sale/i);
  assert.match(html, /closed original apartment offers/i);
  assert.match(html, /combined price, not land price/i);
  assert.match(html, /1(?:<!-- -->)? approximate footprint published/i);
  assert.match(html, /official GIS used for comparison only/i);
  assert.match(html, /Not market price/i);
  assert.match(html, /Row-level publication needs permission/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("pilot data preserves uncertainty and source provenance", async () => {
  const data = await readFile(new URL("../data/pilot.ts", import.meta.url), "utf8");
  assert.match(data, /tnreginet\.gov\.in\/portal/);
  assert.match(data, /eservices\.tn\.gov\.in/);
  assert.match(data, /Advertised asking price aggregate/);
  assert.match(data, /approximate-area-anchor/g);
  assert.match(data, /plotted:\s*false/g);
  assert.match(data, /not a property or parcel coordinate/gi);
  assert.doesNotMatch(data, /evidenceType:\s*["']registered_transaction["']/);
});

test("database schema separates sources, places, geometry, price and planning evidence", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const entity of ["sources", "places", "geometries", "price_evidence", "verification_events", "coverage_scopes", "coverage_units", "source_capture_runs", "guideline_values", "planning_evidence"]) {
    assert.match(schema, new RegExp(`sqliteTable\\(\\\"${entity}\\\"`));
  }
  assert.match(schema, /evidence_type/);
  assert.match(schema, /registered_transaction/);
  assert.match(schema, /auction_reserve/);
  assert.match(schema, /positional_uncertainty_metres/);
});

test("coverage API publishes the honest OMR release gate", async () => {
  const response = await render("/api/coverage");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.programme.id, "omr-corridor-2026");
  assert.equal(payload.programme.releaseReady, false);
  assert.equal(payload.summary.unitCount, 24);
  assert.equal(payload.summary.jurisdictionVerifiedCount, 24);
  assert.equal(payload.summary.currentStreetInventoryVerifiedCount, 24);
  assert.equal(payload.summary.currentOfficialInventoryItemCount, 2715);
  assert.equal(payload.summary.streetRegisterVerifiedCount, 0);
  assert.equal(payload.summary.officialGuidelineRecordCount, 0);
  assert.equal(payload.summary.archivedGuidelineRecordCount, 1);
  assert.equal(payload.summary.pendingGuidelineRecheckCount, 1);
  assert.equal(payload.summary.officialAllotmentRateCount, 2);
  assert.equal(payload.summary.officialAllotmentRateVillageCount, 1);
  assert.equal(payload.summary.officialAuctionReservePriceCount, 1);
  assert.equal(payload.summary.officialAuctionReservePriceVillageCount, 1);
  assert.equal(payload.summary.officialAuctionWinningBidRecordCount, 0);
  assert.equal(payload.summary.officialCommercialAuctionReserveCount, 2);
  assert.equal(payload.summary.officialCommercialAuctionAssetCount, 1);
  assert.equal(payload.summary.officialCommercialAuctionNamedParkAssociationCount, 1);
  assert.equal(payload.summary.officialCommercialAuctionDirectVillageLinkCount, 0);
  assert.equal(payload.summary.officialCommercialAuctionWinningBidRecordCount, 0);
  assert.equal(payload.summary.officialHousingOfferCount, 8);
  assert.equal(payload.summary.closedOfficialHousingOfferCount, 8);
  assert.equal(payload.summary.directHousingOfferVillageCount, 0);
  assert.equal(payload.summary.publishableApproximateGeometryCount, 1);
  assert.equal(payload.summary.exactEvidenceGeometryCount, 0);
  assert.equal(payload.summary.officialEvidenceGeometryPublishedCount, 0);
  assert.equal(payload.summary.officialPlanningRecordCount, 29);
  assert.equal(payload.offices.length, 6);
  assert.equal(payload.evidenceMatrix.length, 24);
  assert.ok(payload.evidenceMatrix.every((entry) => entry.currentGuidelineRegister.status === "verified_metadata_only"));
  assert.ok(payload.evidenceMatrix.every((entry) => entry.currentGuidelineRegister.currentPublishedValueCount === 0));
  assert.ok(payload.evidenceMatrix.every((entry) => entry.registeredTransactions.recordCount === 0));
  assert.ok(payload.evidenceMatrix.every((entry) => entry.publishedLandMarketValue.published === false));
  const siruseri = payload.evidenceMatrix.find((entry) => entry.key === "22604:800000275");
  assert.equal(siruseri.governmentAllotment.recordCount, 2);
  assert.equal(siruseri.officialCommercialAuctionReserves.status, "named_park_reserve_history_found");
  assert.equal(siruseri.officialCommercialAuctionReserves.recordCount, 2);
  assert.equal(siruseri.officialCommercialAuctionReserves.assetCount, 1);
  assert.equal(siruseri.officialCommercialAuctionReserves.directRecordCount, 0);
  assert.equal(siruseri.officialCommercialAuctionReserves.namedParkAssociationCount, 1);
  assert.deepEqual(siruseri.officialCommercialAuctionReserves.reservePriceRangeInr, { low: 281000000, high: 320000000 });
  assert.deepEqual(siruseri.officialCommercialAuctionReserves.derivedCombinedReserveRangeInrPerBuildingSqft, { low: 1964.76, high: 2237.45 });
  assert.equal(siruseri.officialCommercialAuctionReserves.landReservePriceRecordCount, 0);
  assert.equal(siruseri.officialCommercialAuctionReserves.registeredTransactionCount, 0);
  assert.equal(siruseri.officialCommercialAuctionReserves.winningBidRecordCount, 0);
  assert.equal(siruseri.geometry.publishableApproximateCount, 1);
  const sholinganallur1 = payload.evidenceMatrix.find((entry) => entry.key === "20066:254");
  assert.equal(sholinganallur1.officialAuctionReservePrices.status, "direct_reserve_price_record_found");
  assert.equal(sholinganallur1.officialAuctionReservePrices.recordCount, 1);
  assert.deepEqual(sholinganallur1.officialAuctionReservePrices.derivedReservePriceRangeInrPerSqft, { low: 4505.4, high: 4514.24 });
  assert.equal(sholinganallur1.officialAuctionReservePrices.registeredTransactionCount, 0);
  assert.equal(sholinganallur1.officialAuctionReservePrices.winningBidRecordCount, 0);
  assert.equal(payload.evidenceMatrix.filter((entry) => entry.officialAuctionReservePrices.recordCount === 0).length, 23);
  assert.equal(payload.evidenceMatrix.filter((entry) => entry.officialCommercialAuctionReserves.recordCount === 0).length, 23);
  for (const key of ["20066:254", "20066:20514"]) {
    const sholinganallur = payload.evidenceMatrix.find((entry) => entry.key === key);
    assert.equal(sholinganallur.tnhbPublicSales.status, "unresolved_locality_match");
    assert.equal(sholinganallur.tnhbPublicSales.unresolvedRecordCount, 8);
    assert.equal(sholinganallur.tnhbPublicSales.directRecordCount, 0);
  }
  assert.equal(payload.evidenceMatrix.find((entry) => entry.key === "20066:254").planning.directRecordCount, 1);
  assert.equal(payload.evidenceMatrix.find((entry) => entry.key === "20066:20514").planning.directRecordCount, 0);
  assert.equal(payload.evidenceMatrix.find((entry) => entry.key === "20066:246").planning.directRecordCount, 4);
  assert.equal(payload.evidenceMatrix.filter((entry) => entry.planning.status === "no_direct_record_in_ledger").length, 2);
  assert.equal(payload.evidenceMatrix.filter((entry) => entry.tnhbPublicSales.status === "no_normalized_place_name_match_in_snapshot").length, 22);
});

test("evidence API publishes planning provenance, current register metadata and the rights gate", async () => {
  const response = await render("/api/evidence");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.scopeId, "omr-corridor-2026");
  assert.equal(payload.planning.summary.recordCount, 29);
  assert.equal(payload.planning.summary.linkedRecordCount, 26);
  assert.equal(payload.planning.summary.villageCount, 22);
  assert.equal(payload.planning.summary.unresolvedRecordCount, 3);
  assert.equal(payload.planning.summary.sourceCount, 11);
  assert.equal(payload.planning.records.length, 29);
  assert.equal(payload.planning.indexAudits[0].indexPageCount, 30);
  const semmancheriPlan = payload.planning.records.find((record) => record.id === "cmda-pp-nhrb-s-0167-2025-semmancheri");
  assert.equal(semmancheriPlan.siteMetrics.fsiFactor, 1.917);
  assert.equal(semmancheriPlan.siteMetrics.landLeftForRoadWideningSqm, 16.8);
  assert.equal(semmancheriPlan.siteMetrics.localBodyBuildingPermitRequired, true);
  assert.equal(semmancheriPlan.geometryStatus, "unplotted");
  assert.equal(semmancheriPlan.privacy.personalDataFieldsStored, 0);
  assert.equal(payload.officialAllotmentRates.summary.recordCount, 2);
  assert.equal(payload.officialAllotmentRates.summary.villageAssociationCount, 1);
  assert.deepEqual(payload.officialAllotmentRates.summary.normalizedRateRangeInrPerSqft, { low: 1790.63, high: 3581.27 });
  assert.equal(payload.officialAllotmentRates.source.rightsStatus, "no_explicit_reuse_policy_found");
  assert.equal(payload.officialAllotmentRates.location.geometryStatus, "approximate");
  assert.equal(payload.officialAllotmentRates.location.geometryId, "osm-way-98358103");
  assert.equal(payload.officialAllotmentRates.location.currentRegistrationAssociation.status, "named_locality_association");
  assert.equal(payload.officialAllotmentRates.records[0].evidenceType, "government_allotment_plot_cost");
  assert.equal(payload.officialAllotmentRates.records[0].tenure, "99_year_leasehold");
  assert.equal(payload.officialAllotmentRates.records[0].normalizedInrPerSqft, 1790.63);
  assert.equal(payload.officialAllotmentRates.records[1].normalizedInrPerSqft, 3581.27);
  assert.equal(payload.officialAllotmentRates.publication.currentOfficialGuidelineValues, 0);
  assert.equal(payload.officialAllotmentRates.publication.registeredTransactions, 0);
  assert.equal(payload.officialAllotmentRates.subsidy.appliedToPublishedRates, false);
  assert.equal(payload.officialHousingOffers.summary.recordCount, 8);
  assert.equal(payload.officialHousingOffers.summary.currentOfferCount, 0);
  assert.equal(payload.officialHousingOffers.summary.closedOfferCount, 8);
  assert.equal(payload.officialHousingOffers.summary.directVillageLinkCount, 0);
  assert.deepEqual(payload.officialHousingOffers.summary.originalSellingPriceRangeInr, { low: 1043000, high: 6652000 });
  assert.deepEqual(payload.officialHousingOffers.summary.derivedCombinedPriceRangeInrPerPlinthSqft, { low: 2349.1, high: 6110.59 });
  assert.equal(payload.officialHousingOffers.source.sourceResponseRecordCount, 183);
  assert.equal(payload.officialHousingOffers.source.targetRecordCount, 8);
  assert.equal(payload.officialHousingOffers.source.rightsStatus, "no_explicit_reuse_policy_found");
  assert.equal(payload.officialHousingOffers.location.mappingStatus, "unresolved_registration_subdivision");
  assert.deepEqual(payload.officialHousingOffers.location.candidateVillageKeys, ["20066:254", "20066:20514"]);
  assert.equal(payload.officialHousingOffers.location.directVillageLink, false);
  assert.equal(payload.officialHousingOffers.priceInterpretation.landPriceDerivationPermitted, false);
  assert.equal(payload.officialHousingOffers.records.length, 8);
  assert.ok(payload.officialHousingOffers.records.every((record) => record.offerStatusAtAudit === "closed" && record.geometryStatus === "unplotted"));
  assert.equal(payload.officialHousingOffers.publication.landPriceRecords, 0);
  assert.equal(payload.officialHousingOffers.publication.personalDataFieldsStored, 0);
  assert.match(payload.officialHousingOffers.publicationRule, /must never be relabelled as a land price/i);
  assert.equal(payload.officialAuctionReservePrices.summary.recordCount, 1);
  assert.equal(payload.officialAuctionReservePrices.summary.directVillageLinkCount, 1);
  assert.equal(payload.officialAuctionReservePrices.summary.registeredTransactionCount, 0);
  assert.equal(payload.officialAuctionReservePrices.summary.winningBidRecordCount, 0);
  assert.deepEqual(payload.officialAuctionReservePrices.summary.derivedReservePriceRangeInrPerSqft, { low: 4505.4, high: 4514.24 });
  assert.equal(payload.officialAuctionReservePrices.location.officialVillageCode, "254");
  assert.equal(payload.officialAuctionReservePrices.location.geometryStatus, "unplotted");
  assert.equal(payload.officialAuctionReservePrices.asset.documentAreaSqft, 426888);
  assert.equal(payload.officialAuctionReservePrices.records[0].lifecycleStatus, "auction_concluded_outcome_price_unpublished");
  assert.equal(payload.officialAuctionReservePrices.records[0].winningBidInr, null);
  assert.equal(payload.officialAuctionReservePrices.publication.personalDataFieldsStored, 0);
  assert.match(payload.officialAuctionReservePrices.publicationRule, /must never be relabelled as the winning bid/i);
  assert.equal(payload.officialCommercialAuctionReserves.summary.recordCount, 2);
  assert.equal(payload.officialCommercialAuctionReserves.summary.assetCount, 1);
  assert.equal(payload.officialCommercialAuctionReserves.summary.namedParkAssociationCount, 1);
  assert.equal(payload.officialCommercialAuctionReserves.summary.directVillageLinkCount, 0);
  assert.equal(payload.officialCommercialAuctionReserves.summary.landReservePriceRecordCount, 0);
  assert.equal(payload.officialCommercialAuctionReserves.summary.registeredTransactionCount, 0);
  assert.equal(payload.officialCommercialAuctionReserves.summary.winningBidRecordCount, 0);
  assert.deepEqual(payload.officialCommercialAuctionReserves.summary.reservePriceRangeInr, { low: 281000000, high: 320000000 });
  assert.deepEqual(payload.officialCommercialAuctionReserves.summary.derivedCombinedReserveRangeInrPerBuildingSqft, { low: 1964.76, high: 2237.45 });
  assert.equal(payload.officialCommercialAuctionReserves.location.mappingStatus, "named_park_association");
  assert.equal(payload.officialCommercialAuctionReserves.location.directVillageLink, false);
  assert.equal(payload.officialCommercialAuctionReserves.location.geometryStatus, "unplotted");
  assert.equal(payload.officialCommercialAuctionReserves.asset.plotNumber, "A-17");
  assert.equal(payload.officialCommercialAuctionReserves.asset.buildingAreaSqft, 143020);
  assert.equal(payload.officialCommercialAuctionReserves.records.length, 2);
  assert.equal(payload.officialCommercialAuctionReserves.records[1].totalReservePriceInr, 281000000);
  assert.equal(payload.officialCommercialAuctionReserves.records[1].winningBidInr, null);
  assert.equal(payload.officialCommercialAuctionReserves.reconciliation.reserveReductionPercent, 12.19);
  assert.equal(payload.officialCommercialAuctionReserves.publication.personalDataFieldsStored, 0);
  assert.match(payload.officialCommercialAuctionReserves.publicationRule, /must never be relabelled as a land rate/i);
  assert.equal(payload.geometryEvidence.summary.publishableGeometryCount, 1);
  assert.equal(payload.geometryEvidence.summary.approximateGeometryCount, 1);
  assert.equal(payload.geometryEvidence.summary.exactGeometryCount, 0);
  assert.equal(payload.geometryEvidence.summary.officialGeometryPublishedCount, 0);
  assert.equal(payload.geometryEvidence.decision.officialBoundaryClaim, false);
  assert.equal(payload.geometryEvidence.officialVerificationSource.geometryPublishedByMito, false);
  assert.equal(payload.geometryEvidence.openSource.objectId, 98358103);
  assert.equal(payload.geometryEvidence.openSource.license, "ODbL-1.0");
  assert.equal(payload.geometryEvidence.comparison.openCentroidInsideOfficialBoundary, true);
  assert.equal(payload.geometryEvidence.featureCollection.features[0].properties.geometryStatus, "approximate");
  assert.equal(payload.guidelineValueCollection.captureRun.status, "blocked");
  assert.equal(payload.guidelineValueCollection.captureRun.recordsSeen, 10);
  assert.equal(payload.guidelineValueCollection.captureRun.recordsAccepted, 0);
  assert.equal(payload.guidelineValueCollection.captureRun.recordsWithheld, 10);
  assert.equal(payload.guidelineValueCollection.captureRun.blockerCode, "REDISTRIBUTION_PERMISSION_REQUIRED");
  assert.equal(payload.guidelineValueCollection.archivedSnapshot.summary.recordCount, 1);
  assert.equal(payload.guidelineValueCollection.archivedSnapshot.summary.verifiedCurrentCount, 0);
  assert.equal(payload.guidelineValueCollection.archivedSnapshot.records[0].sourceStreetName, "CHIDAMBARAM NAGAR 1ST STREET");
  assert.equal(payload.guidelineValueCollection.archivedSnapshot.records[0].valueInrPerSqft, 4400);
  assert.equal(payload.guidelineValueCollection.archivedSnapshot.records[0].verificationStatus, "pending");
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.auditedVillageCount, 24);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.targetVillageCount, 24);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.currentInventoryCount, 2715);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.sholinganallur1InventoryCount, 758);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.currentOfficialRowsStored, 0);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.currentOfficialValuesPublished, 0);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.summary.permissionRequired, true);
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.queries.length, 24);
  assert.ok(payload.guidelineValueCollection.currentOfficialRegister.queries.every((query) => query.rowDataRepublished === false));
  assert.equal(payload.guidelineValueCollection.currentOfficialRegister.reconciliation.status, "resolved_for_current_inventory");
  assert.equal(payload.guidelineValueCollection.secondaryCorroboration.summary.matchedRowCount, 1);
  assert.equal(payload.guidelineValueCollection.secondaryCorroboration.summary.exactFieldMatchCount, 1);
  assert.equal(payload.guidelineValueCollection.secondaryCorroboration.summary.currentOfficialPromotionCount, 0);
  assert.equal(payload.guidelineValueCollection.secondaryCorroboration.scopeClaims.claimedStreetCount, 758);
  assert.equal(payload.guidelineValueCollection.secondaryCorroboration.conflicts[0].status, "resolved_for_current_inventory");
  assert.equal(payload.guidelineValueCollection.importContract.schemaVersion, "1.1.0");
  assert.ok(payload.guidelineValueCollection.importContract.requiredRowFields.includes("officialStreetCode"));
});

test("resolver API matches verified portal variants and official identifiers", async () => {
  const variantResponse = await render("/api/resolve?query=Tharamani");
  assert.equal(variantResponse.status, 200);
  const variant = await variantResponse.json();
  assert.equal(variant.result.status, "matched");
  assert.equal(variant.result.confidence, "variant");
  assert.equal(variant.result.matches.length, 1);
  assert.equal(variant.result.matches[0].unit.nameEn, "Taramani");
  assert.equal(variant.result.matches[0].inventoryQuery.guidelineVillageName, "Tharamani");

  const codeResponse = await render("/api/resolve?query=20066%3A253");
  assert.equal(codeResponse.status, 200);
  const code = await codeResponse.json();
  assert.equal(code.result.status, "matched");
  assert.equal(code.result.confidence, "exact");
  assert.equal(code.result.matches[0].unit.nameEn, "Seevaram");
});

test("resolver API preserves ambiguity, Tamil aliases and unresolved conflicts", async () => {
  const ambiguousResponse = await render("/api/resolve?query=Sholinganallur");
  assert.equal(ambiguousResponse.status, 200);
  const ambiguous = await ambiguousResponse.json();
  assert.equal(ambiguous.result.status, "ambiguous");
  assert.deepEqual(ambiguous.result.matches.map((match) => match.key), ["20066:254", "20066:20514"]);

  const tamilResponse = await render("/api/resolve?query=%E0%AE%9A%E0%AF%86%E0%AE%AE%E0%AF%8D%E0%AE%AE%E0%AE%9E%E0%AF%8D%E0%AE%9A%E0%AF%87%E0%AE%B0%E0%AE%BF");
  assert.equal(tamilResponse.status, 200);
  const tamil = await tamilResponse.json();
  assert.equal(tamil.result.status, "matched");
  assert.equal(tamil.result.matches[0].unit.nameEn, "Semmancheri");

  const unresolvedResponse = await render("/api/resolve?query=Kalipattur");
  assert.equal(unresolvedResponse.status, 200);
  const unresolved = await unresolvedResponse.json();
  assert.equal(unresolved.result.status, "unresolved");
  assert.equal(unresolved.result.matches.length, 0);
  assert.match(unresolved.result.explanation, /does not merge/i);
});

test("Chennai coverage API publishes the source inventory and unresolved official conflict", async () => {
  const response = await render("/api/chennai-coverage");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.scopeId, "chennai-district-revenue-2026");
  assert.equal(payload.summary.talukGroupCount, 17);
  assert.equal(payload.summary.sourceVillageCount, 144);
  assert.equal(payload.summary.firkaCount, 49);
  assert.equal(payload.summary.registrationCrosswalkCount, 9);
  assert.equal(payload.summary.ambiguousRegistrationCrosswalkCount, 3);
  assert.equal(payload.summary.currentInventoryMetadataCount, 9);
  assert.equal(payload.summary.currentInventoryItemCount, 2117);
  assert.equal(payload.summary.officialGuidelineValueCount, 0);
  assert.equal(payload.summary.registeredTransactionCount, 0);
  assert.equal(payload.summary.plottedGeometryCount, 0);
  assert.equal(payload.summary.authoritativeRoadFeaturesDiscovered, 37225);
  assert.equal(payload.summary.authoritativeWardPolygonsDiscovered, 200);
  assert.equal(payload.summary.authoritativeZonePolygonsDiscovered, 15);
  assert.equal(payload.summary.publishableAuthoritativeGeometryCount, 0);
  assert.equal(payload.summary.geometryPermissionGatedSourceCount, 3);
  assert.equal(payload.summary.conflictCount, 1);
  assert.equal(payload.taluks.length, 17);
  assert.equal(payload.talukCrosswalkProgress.find((taluk) => taluk.talukName === "Velachery").verifiedCrosswalkCount, 2);
  assert.equal(payload.talukCrosswalkProgress.find((taluk) => taluk.talukName === "Sholinganallur").verifiedCrosswalkCount, 7);
  assert.equal(payload.registrationCrosswalk.summary.currentOfficialValuesPublished, 0);
  assert.equal(payload.geometrySourceAudit.decision.status, "permission_required");
  assert.equal(payload.geometrySourceAudit.summary.officialGeometryFeaturesPublished, 0);
  assert.equal(payload.geometrySourceAudit.sources[0].technicalEvidence.nativeCrs, "EPSG:32644");
  assert.equal(payload.conflicts[0].status, "unresolved");
});

test("Chennai resolver exposes a verified registration identity without inventing a price", async () => {
  const response = await render("/api/chennai-coverage?query=Taramani");
  assert.equal(response.status, 200);
  const payload = await response.json();
  const match = payload.resolution.matches[0];
  assert.equal(payload.resolution.status, "matched");
  assert.equal(match.key, "8:3");
  assert.equal(match.registrationCrosswalkStatus, "verified");
  assert.equal(match.registrationCrosswalk.officialSroCode, "20051");
  assert.equal(match.registrationCrosswalk.officialVillageCode, "7");
  assert.equal(match.registrationCrosswalk.currentInventoryItemCount, 80);
  assert.equal(match.officialGuidelineValues, 0);
  assert.equal(match.registeredTransactions, 0);
  assert.equal(match.geometryStatus, "unplotted");
});

test("Chennai resolver keeps duplicate village names separate by taluk", async () => {
  const response = await render("/api/chennai-coverage?query=Alandur");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.resolution.status, "ambiguous");
  assert.equal(payload.resolution.matches.length, 2);
  assert.deepEqual(payload.resolution.matches.map((match) => match.talukName), ["Guindy", "Alandur"]);
  assert.ok(payload.resolution.matches.every((match) => match.registrationCrosswalkStatus === "not_started"));
});
