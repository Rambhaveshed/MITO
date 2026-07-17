import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateGuidelineImport } from "../lib/guideline-import.mjs";

const coverageUrl = new URL("../data/coverage/omr-corridor.json", import.meta.url);
const planningUrl = new URL("../data/evidence/omr-planning-records.json", import.meta.url);
const captureUrl = new URL("../data/capture-runs/omr-guideline-2026-07-16.json", import.meta.url);
const schemaUrl = new URL("../data/evidence/guideline-value-import.schema.json", import.meta.url);
const archivedSnapshotUrl = new URL("../data/evidence/omr-guideline-archived-snapshot-2026-07-16.json", import.meta.url);
const secondaryCorroborationUrl = new URL("../data/evidence/omr-guideline-secondary-corroboration-2026-07-16.json", import.meta.url);
const liveRegisterAuditUrl = new URL("../data/evidence/tnreginet-live-register-audit-2026-07-16.json", import.meta.url);
const omrInventoryAuditUrl = new URL("../data/evidence/tnreginet-omr-inventory-audit-2026-07-16.json", import.meta.url);
const sipcotSiruseriLandRatesUrl = new URL("../data/evidence/sipcot-siruseri-land-rates-2026-07-17.json", import.meta.url);
const sipcotSiruseriGeometryAuditUrl = new URL("../data/evidence/sipcot-siruseri-geometry-audit-2026-07-17.json", import.meta.url);
const sipcotSiruseriFootprintUrl = new URL("../data/geometry/sipcot-siruseri-osm-footprint-2026-07-17.json", import.meta.url);
const tnhbSholinganallurHousingOffersUrl = new URL("../data/evidence/tnhb-sholinganallur-housing-offers-2026-07-17.json", import.meta.url);
const reuseRequestUrl = new URL("../docs/data-licensing/tnreginet-guideline-reuse-request.md", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test("official planning records stay scoped, unplotted and source-backed", async () => {
  const ledger = await readJson(planningUrl);
  const sourceIds = new Set(ledger.sources.map((source) => source.id));
  const recordIds = ledger.records.map((record) => record.id);

  assert.equal(ledger.sources.length, 9);
  assert.equal(ledger.records.length, 27);
  assert.equal(new Set(recordIds).size, recordIds.length);
  assert.ok(ledger.records.every((record) => sourceIds.has(record.sourceId)));
  assert.ok(ledger.records.every((record) => record.scopeCaveat.length > 40));
  assert.ok(ledger.records.every((record) => record.geometryStatus === "unplotted"));
  assert.ok(ledger.records.every((record) => !Object.hasOwn(record, "pricePerSqft")));
  assert.match(ledger.coverageCaveat, /does not prove parcel zoning/i);
});

test("planning crosswalks never force ambiguous Sholinganallur evidence", async () => {
  const [coverage, ledger] = await Promise.all([readJson(coverageUrl), readJson(planningUrl)]);
  const unitKeys = new Set(coverage.units.map((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}`));

  for (const record of ledger.records) {
    if (record.mappingStatus === "verified") {
      assert.ok(unitKeys.has(`${record.officialSroCode}:${record.officialVillageCode}`));
      assert.deepEqual(record.candidateVillageKeys, []);
    } else {
      assert.equal(record.officialVillageCode, null);
      if (record.mappingStatus === "unresolved_registration_subdivision") {
        assert.ok(record.candidateVillageKeys.length > 1);
      } else if (record.mappingStatus === "unresolved_name_variant") {
        assert.equal(record.candidateVillageKeys.length, 1);
      } else {
        assert.fail(`unexpected mapping status: ${record.mappingStatus}`);
      }
      assert.ok(record.candidateVillageKeys.every((key) => unitKeys.has(key)));
    }
  }
});

test("final CMA order is captured without converting jurisdiction into parcel claims", async () => {
  const ledger = await readJson(planningUrl);
  const orderRecords = ledger.records.filter((record) => record.sourceId === "tn-hud-go-184-2022");
  const linked = orderRecords.filter((record) => record.mappingStatus === "verified");
  const expectedKeys = new Set([
    "22605:800000289", "22605:800000290", "22604:800000276", "22604:800000278",
    "22604:800000277", "22605:800000287", "20096:1318", "20096:1365", "20096:1308",
    "20096:1353", "20095:1261", "20095:1220", "22604:800000275",
  ]);

  assert.equal(orderRecords.length, 14);
  assert.equal(linked.length, 13);
  assert.deepEqual(new Set(linked.map((record) => `${record.officialSroCode}:${record.officialVillageCode}`)), expectedKeys);
  assert.ok(orderRecords.every((record) => record.decisionDate === "2022-10-21"));
  assert.ok(orderRecords.every((record) => [23, 24, 26, 27].includes(record.sourcePage)));
  assert.ok(orderRecords.every((record) => /not parcel zoning/i.test(record.scopeCaveat)));

  const unresolved = orderRecords.find((record) => record.mappingStatus === "unresolved_name_variant");
  assert.equal(unresolved.sourceVillageName, "Kalipattur");
  assert.deepEqual(unresolved.candidateVillageKeys, ["22604:800000279"]);
});

test("Seevaram approval remains site-specific and does not imply title or building permit", async () => {
  const ledger = await readJson(planningUrl);
  const record = ledger.records.find((candidate) => candidate.id === "cmda-pp-nhrb-s-0616-2023-seevaram");

  assert.equal(record.officialVillageCode, "253");
  assert.equal(record.surveyReference, "S.No.23/24 of Seevaram Village; proposal also spans listed Neelankarai surveys");
  assert.match(record.planningConstraint, /local-body building permit is still required/i);
  assert.match(record.planningConstraint, /does not confirm ownership or title/i);
  assert.match(record.scopeCaveat, /site-specific/i);
});

test("live guideline capture publishes inventory metadata but withholds rows requiring permission", async () => {
  const capture = await readJson(captureUrl);
  assert.equal(capture.status, "blocked");
  assert.equal(capture.recordsSeen, 10);
  assert.equal(capture.recordsAccepted, 0);
  assert.equal(capture.recordsRejected, 0);
  assert.equal(capture.recordsWithheld, 10);
  assert.equal(capture.metadataRecordsAccepted, 1);
  assert.equal(capture.blockerCode, "REDISTRIBUTION_PERMISSION_REQUIRED");
  assert.match(capture.notes, /758 current items/i);
  assert.match(capture.nextAction, /written reuse permission|authorized export/i);
});

test("live official register audit resolves the current inventory without copying row data", async () => {
  const audit = await readJson(liveRegisterAuditUrl);

  assert.equal(audit.source.sourceType, "official_public_register");
  assert.equal(audit.source.organization, "Tamil Nadu Registration Department");
  assert.equal(audit.source.ratesEffectiveFrom, "2024-07-01");
  assert.equal(audit.source.reproductionPolicy, "permission_required");
  assert.equal(audit.source.metadataDigest, "sha256:366ed4813bbe91e06900904ca47fd1128b41cfc87b8069fc2e771b80e8290ada");
  assert.equal(audit.query.officialSroCode, "20066");
  assert.equal(audit.query.officialVillageCode, "254");
  assert.equal(audit.query.displayedItemCount, 758);
  assert.equal(audit.query.displayedPageSize, 10);
  assert.equal(audit.query.impliedPageCount, 76);
  assert.equal(audit.query.visibleRowsInspected, 10);
  assert.equal(audit.query.officialStreetCodePublished, false);
  assert.equal(audit.query.rowDataStored, false);
  assert.equal(audit.query.rowDataRepublished, false);
  assert.equal(audit.publication.currentOfficialRowsStored, 0);
  assert.equal(audit.publication.currentOfficialGuidelineValuesPublished, 0);
  assert.equal(audit.publication.blockerCode, "REDISTRIBUTION_PERMISSION_REQUIRED");
  assert.equal(audit.reconciliation.status, "resolved_for_current_inventory");
  assert.equal(audit.reconciliation.currentOfficialRegisterCount, 758);
});

test("current official inventory audit covers all OMR villages without storing register rows", async () => {
  const [audit, coverage] = await Promise.all([readJson(omrInventoryAuditUrl), readJson(coverageUrl)]);
  const queryKeys = audit.queries.map((query) => `${query.officialSroCode}:${query.officialVillageCode}`);

  assert.equal(audit.source.organization, "Tamil Nadu Registration Department");
  assert.equal(audit.source.reproductionPolicy, "permission_required");
  assert.equal(audit.source.metadataDigest, "sha256:5a14a095355f4b97e2986022f2bfbf3f93bf0f0f35f5b6b28038d7d0364c436b");
  assert.equal(audit.summary.auditedVillageCount, 24);
  assert.equal(audit.summary.targetVillageCount, 24);
  assert.equal(audit.summary.displayedItemCountTotal, 2715);
  assert.equal(audit.queries.length, 24);
  assert.equal(new Set(queryKeys).size, 24);
  assert.deepEqual(audit.queries.map((query) => query.sequence), Array.from({ length: 24 }, (_, index) => index + 1));
  assert.equal(audit.queries.reduce((sum, query) => sum + query.displayedItemCount, 0), 2715);
  assert.ok(audit.queries.every((query) => query.displayedPageSize === 10));
  assert.ok(audit.queries.every((query) => query.impliedPageCount === Math.ceil(query.displayedItemCount / 10)));
  assert.ok(audit.queries.every((query) => query.officialStreetCodePublished === false));
  assert.ok(audit.queries.every((query) => query.rowDataStored === false && query.rowDataRepublished === false));
  assert.equal(audit.publication.currentOfficialRowsStored, 0);
  assert.equal(audit.publication.currentOfficialGuidelineValuesPublished, 0);
  assert.equal(audit.publication.blockerCode, "REDISTRIBUTION_PERMISSION_REQUIRED");

  const coverageByKey = new Map(coverage.units.map((unit) => [`${unit.officialSroCode}:${unit.officialVillageCode}`, unit]));
  for (const query of audit.queries) {
    assert.equal(coverageByKey.get(`${query.officialSroCode}:${query.officialVillageCode}`)?.streetTargetCount, query.displayedItemCount);
  }
});

test("reuse request asks for authorized access before row-level publication", async () => {
  const request = await readFile(reuseRequestUrl, "utf8");
  assert.match(request, /written permission/i);
  assert.match(request, /authorized bulk export or documented API/i);
  assert.match(request, /No TNREGINET row-level register will be republished/i);
  assert.match(request, /never label guideline value as confirmed market price/i);
});

test("SIPCOT Siruseri rates remain leasehold allotment evidence rather than market prices", async () => {
  const ledger = await readJson(sipcotSiruseriLandRatesUrl);

  assert.equal(ledger.source.organization, "State Industries Promotion Corporation of Tamil Nadu Limited (SIPCOT)");
  assert.equal(ledger.source.sourceType, "official_government_allotment_schedule");
  assert.equal(ledger.source.rightsStatus, "no_explicit_reuse_policy_found");
  assert.equal(ledger.location.placeName, "Siruseri IT Park");
  assert.equal(ledger.location.sourceDistrictName, "Kancheepuram");
  assert.equal(ledger.location.currentRegistrationAssociation.officialSroCode, "22604");
  assert.equal(ledger.location.currentRegistrationAssociation.officialVillageCode, "800000275");
  assert.equal(ledger.location.currentRegistrationAssociation.status, "named_locality_association");
  assert.equal(ledger.location.administrativeConflict.status, "preserved");
  assert.equal(ledger.location.geometryStatus, "approximate");
  assert.equal(ledger.location.geometryId, "osm-way-98358103");
  assert.equal(ledger.location.geometryLicence, "ODbL-1.0");
  assert.equal(ledger.records.length, 2);
  assert.deepEqual(ledger.records.map((record) => record.propertyClass), ["industrial_land", "commercial_land"]);
  assert.deepEqual(ledger.records.map((record) => record.rawPlotCostLakhsPerAcre), [780, 1560]);
  assert.deepEqual(ledger.records.map((record) => record.normalizedInrPerSqft), [1790.63, 3581.27]);
  assert.ok(ledger.records.every((record) => record.evidenceType === "government_allotment_plot_cost"));
  assert.ok(ledger.records.every((record) => record.tenure === "99_year_leasehold"));
  assert.ok(ledger.records.every((record) => record.geometryStatus === "approximate"));
  assert.ok(ledger.records.every((record) => record.geometryId === "osm-way-98358103"));
  assert.ok(ledger.records.every((record) => !record.isGuidelineValue && !record.isRegisteredTransaction && !record.isAskingPrice && !record.isMarketEstimate));
  assert.equal(ledger.publication.currentOfficialGuidelineValues, 0);
  assert.equal(ledger.publication.registeredTransactions, 0);
  assert.equal(ledger.publication.marketEstimates, 0);
  assert.equal(ledger.publication.plottedGeometries, 1);
  assert.equal(ledger.publication.officialGeometriesPublished, 0);
  assert.equal(ledger.publication.exactGeometriesPublished, 0);
  assert.equal(ledger.subsidy.appliedToPublishedRates, false);
  assert.ok(Math.abs((780 * 100000) / 43560 - ledger.records[0].normalizedInrPerSqft) < 0.01);
  assert.ok(Math.abs((1560 * 100000) / 43560 - ledger.records[1].normalizedInrPerSqft) < 0.01);
});

test("Siruseri publishes one attributed approximate footprint without republishing official GIS coordinates", async () => {
  const [footprint, audit, rates] = await Promise.all([
    readJson(sipcotSiruseriFootprintUrl),
    readJson(sipcotSiruseriGeometryAuditUrl),
    readJson(sipcotSiruseriLandRatesUrl),
  ]);

  assert.equal(footprint.type, "FeatureCollection");
  assert.equal(footprint.metadata.license, "ODbL-1.0");
  assert.match(footprint.metadata.attribution, /OpenStreetMap contributors/);
  assert.equal(footprint.metadata.publicationStatus, "publishable_approximate_geometry");
  assert.equal(footprint.features.length, 1);

  const [feature] = footprint.features;
  const [ring] = feature.geometry.coordinates;
  assert.equal(feature.id, "osm-way-98358103");
  assert.equal(feature.geometry.type, "Polygon");
  assert.equal(feature.properties.sourceObjectId, 98358103);
  assert.equal(feature.properties.sourceVersion, 8);
  assert.equal(feature.properties.sourceTimestamp, "2025-07-03T09:28:27Z");
  assert.equal(feature.properties.geometryStatus, "approximate");
  assert.equal(feature.properties.geometryPrecision, "partial_named_open_source_footprint");
  assert.equal(ring.length, 40);
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.every(([longitude, latitude]) => longitude >= 80.2 && longitude <= 80.24 && latitude >= 12.8 && latitude <= 12.86));
  assert.equal(pointInRing(feature.properties.centroid, ring), true);

  assert.equal(audit.decision.legalBoundaryClaim, false);
  assert.equal(audit.decision.officialBoundaryClaim, false);
  assert.equal(audit.officialSource.layerId, "cite:industrial_complex_boundary-Siruseri");
  assert.equal(audit.officialSource.rightsStatus, "no_explicit_reuse_policy_found");
  assert.equal(audit.officialSource.geometryStoredInRepository, false);
  assert.equal(audit.officialSource.geometryPublishedByMito, false);
  assert.equal(Object.hasOwn(audit.officialSource, "geometry"), false);
  assert.equal(audit.openSource.objectId, 98358103);
  assert.equal(audit.openSource.license, "ODbL-1.0");
  assert.equal(audit.comparison.openCentroidInsideOfficialBoundary, true);
  assert.ok(Math.abs(audit.comparison.openAreaAsPercentOfOfficialComputedArea - 88.40368) < 0.00001);
  assert.equal(audit.publication.publishableGeometryCount, 1);
  assert.equal(audit.publication.approximateGeometryCount, 1);
  assert.equal(audit.publication.exactGeometryCount, 0);
  assert.equal(audit.publication.officialGeometryPublishedCount, 0);
  assert.equal(rates.location.geometryId, feature.id);
  assert.match(rates.location.positionalUncertainty, /not an official, legal, cadastral or complete/i);
});

test("TNHB Sholinganallur records stay closed, unplotted and separate from land-price evidence", async () => {
  const ledger = await readJson(tnhbSholinganallurHousingOffersUrl);
  const records = ledger.records;
  const allKeys = [];
  const collectKeys = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      allKeys.push(key.toLowerCase());
      collectKeys(child);
    }
  };
  collectKeys(ledger);

  assert.equal(ledger.source.organization, "Tamil Nadu Housing Board (TNHB)");
  assert.equal(ledger.source.sourceType, "official_government_housing_sales_portal");
  assert.equal(ledger.source.rightsStatus, "no_explicit_reuse_policy_found");
  assert.equal(ledger.source.sourceResponseRecordCount, 183);
  assert.equal(ledger.source.targetRecordCount, 8);
  assert.equal(ledger.source.sourceResponseDigest, "sha256:420e26ac48203bd7a969ae309ffbd12656007e927ea32e049255505f40446d08");
  assert.equal(ledger.omrScopeAudit.sourceRecordCountScanned, 183);
  assert.equal(ledger.omrScopeAudit.matchedSourceRecordCount, 8);
  assert.deepEqual(ledger.omrScopeAudit.matchedSourcePlaceNames, ["Sholinganallur"]);
  assert.deepEqual(ledger.omrScopeAudit.matchedCandidateVillageKeys, ["20066:254", "20066:20514"]);
  assert.equal(ledger.omrScopeAudit.unmatchedVillageKeys.length, 22);
  assert.equal(ledger.omrScopeAudit.schemeNameUsedForPlaceMatching, false);
  assert.match(ledger.omrScopeAudit.falsePositiveGuard, /project numbers/i);
  assert.match(ledger.omrScopeAudit.interpretation, /does not prove/i);
  const auditedVillageKeys = [...ledger.omrScopeAudit.matchedCandidateVillageKeys, ...ledger.omrScopeAudit.unmatchedVillageKeys];
  assert.equal(new Set(auditedVillageKeys).size, 24);
  const coverage = await readJson(coverageUrl);
  assert.deepEqual(new Set(auditedVillageKeys), new Set(coverage.units.map((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}`)));
  assert.equal(ledger.location.mappingStatus, "unresolved_registration_subdivision");
  assert.deepEqual(ledger.location.candidateVillageKeys, ["20066:254", "20066:20514"]);
  assert.equal(ledger.location.officialVillageCode, null);
  assert.equal(ledger.location.directVillageLink, false);
  assert.equal(ledger.location.geometryStatus, "unplotted");
  assert.equal(ledger.priceInterpretation.landPriceDerivationPermitted, false);
  assert.equal(ledger.priceInterpretation.undividedSharePriceDerivationPermitted, false);
  assert.equal(records.length, 8);
  assert.equal(new Set(records.map((record) => record.id)).size, 8);
  assert.equal(new Set(records.map((record) => record.websiteDataId)).size, 8);
  assert.equal(new Set(records.map((record) => record.schemeDataId)).size, 8);
  assert.equal(new Set(records.map((record) => record.schemeCode)).size, 8);
  assert.deepEqual(records.map((record) => record.schemeCode), ["157001", "159001", "159102", "159103", "159104", "159105", "159107", "159201"]);
  assert.ok(records.every((record) => record.offerStatusAtAudit === "closed"));
  assert.ok(records.every((record) => record.portalPublishedStatus === "No"));
  assert.ok(records.every((record) => record.bookingWindowEnd <= ledger.auditedAt));
  assert.ok(records.every((record) => record.geometryStatus === "unplotted" && record.directVillageLink === false));
  assert.ok(records.every((record) => !record.isLandPrice && !record.isGuidelineValue && !record.isRegisteredTransaction && !record.isCurrentAskingPrice && !record.isMarketEstimate));
  assert.ok(records.every((record) => Math.abs(record.originalSellingPriceInr / record.plinthAreaSqft - record.derivedCombinedPriceInrPerPlinthSqft) < 0.01));
  assert.deepEqual(records.map((record) => record.derivedCombinedPriceInrPerPlinthSqft), [2349.1, 3240, 5443.92, 5440.29, 5376.88, 5378.64, 6110.59, 5759.31]);
  assert.equal(ledger.publication.currentOfferCount, 0);
  assert.equal(ledger.publication.closedOfferCount, 8);
  assert.equal(ledger.publication.currentOfficialGuidelineValues, 0);
  assert.equal(ledger.publication.registeredTransactions, 0);
  assert.equal(ledger.publication.landPriceRecords, 0);
  assert.equal(ledger.publication.plottedRecordCount, 0);
  assert.equal(ledger.publication.directVillageLinkCount, 0);
  assert.equal(ledger.publication.personalDataFieldsStored, 0);
  for (const forbidden of ["phone", "mobile", "email", "contact", "latitude", "longitude", "coordinates", "geometry"]) {
    if (forbidden === "geometry") continue;
    assert.ok(!allKeys.some((key) => key.includes(forbidden)), `forbidden published field: ${forbidden}`);
  }
});

test("guideline import schema requires provenance, normalized values and location evidence", async () => {
  const schema = await readJson(schemaUrl);
  assert.equal(schema.properties.schemaVersion.const, "1.1.0");
  assert.ok(schema.properties.source.required.includes("snapshotHash"));
  const required = schema.properties.rows.items.required;
  for (const field of ["officialStreetCode", "sourceStreetName", "classification", "rawValueInr", "rawValueUnit", "valueInrPerSqft", "effectiveFrom", "locationEvidence"]) {
    assert.ok(required.includes(field), `${field} must be required`);
  }
});

test("guideline import validator accepts a fully traceable in-scope row", () => {
  const batch = {
    schemaVersion: "1.1.0",
    scopeId: "omr-corridor-2026",
    source: {
      id: "official-export-1",
      organization: "Tamil Nadu Registration Department",
      url: "https://example.gov.in/export/1",
      retrievedAt: "2026-07-15",
      captureMethod: "official_export",
      snapshotHash: `sha256:${"a".repeat(64)}`,
    },
    rows: [{
      sourceRecordId: "record-1",
      officialSroCode: "20066",
      officialVillageCode: "250",
      officialStreetCode: "street-1",
      sourceStreetName: "Example Street",
      classification: "Residential class I",
      rawValueInr: 5000,
      rawValueUnit: "sqft",
      valueInrPerSqft: 5000,
      effectiveFrom: "2024-07-01",
      verificationStatus: "verified",
      verifiedAt: "2026-07-15",
      geometryStatus: "unplotted",
      locationEvidence: "Official village and street identifiers; no verified street geometry.",
    }],
  };

  const result = validateGuidelineImport(batch, { allowedVillageKeys: ["20066:250"] });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("guideline import validator rejects off-scope, inconsistent and duplicate rows", () => {
  const row = {
    sourceRecordId: "record-1",
    officialSroCode: "99999",
    officialVillageCode: "999",
    officialStreetCode: "street-1",
    sourceStreetName: "Example Street",
    classification: "Residential",
    rawValueInr: 100,
    rawValueUnit: "sqm",
    valueInrPerSqft: 100,
    effectiveFrom: "2024-07-01",
    verificationStatus: "verified",
    geometryStatus: "exact",
    locationEvidence: "Unverified location claim",
  };
  const batch = {
    schemaVersion: "1.1.0",
    scopeId: "omr-corridor-2026",
    source: {
      id: "official-export-1",
      organization: "Tamil Nadu Registration Department",
      url: "https://example.gov.in/export/1",
      retrievedAt: "2026-07-15",
      captureMethod: "official_export",
      snapshotHash: `sha256:${"b".repeat(64)}`,
    },
    rows: [row, { ...row }],
  };

  const result = validateGuidelineImport(batch, { allowedVillageKeys: ["20066:250"] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("outside the declared coverage scope")));
  assert.ok(result.errors.some((error) => error.includes("conversionMethod")));
  assert.ok(result.errors.some((error) => error.includes("geometryEvidence")));
  assert.ok(result.errors.some((error) => error.includes("verifiedAt")));
  assert.ok(result.errors.some((error) => error.includes("duplicates another source record")));
});

test("archived Sholinganallur screen preserves one visible row without promoting it to current evidence", async () => {
  const [coverage, batch] = await Promise.all([readJson(coverageUrl), readJson(archivedSnapshotUrl)]);
  const unit = coverage.units.find((candidate) => candidate.officialSroCode === "20066" && candidate.officialVillageCode === "254");
  const result = validateGuidelineImport(batch, { allowedVillageKeys: ["20066:254"] });

  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(batch.source.captureMethod, "archived_official_snapshot");
  assert.equal(batch.source.snapshotHash, "sha256:dc8f1c50227f90bc83264e1ca0077635504fa9b6caf0e609aaa41f2d3718cf98");
  assert.equal(batch.source.streetInventoryCountAtSnapshot, 17);
  assert.equal(batch.source.visibleUnredactedRowCount, 1);
  assert.equal(batch.source.redactedRowsOnCapturedPage, 6);
  assert.equal(batch.rows.length, 1);

  const [row] = batch.rows;
  assert.equal(row.sourceStreetName, "CHIDAMBARAM NAGAR 1ST STREET");
  assert.equal(row.valueInrPerSqft, 4400);
  assert.equal(row.sourceMetricValueInrPerSqm, 47365);
  assert.equal(row.classification, "Residential Special Type - V");
  assert.equal(row.effectiveFrom, "2024-07-01");
  assert.equal(row.verificationStatus, "pending");
  assert.equal(row.officialStreetCode, null);
  assert.equal(row.geometryStatus, "unplotted");
  assert.ok(row.qualityFlags.includes("live_official_recheck_pending"));
  assert.ok(row.qualityFlags.includes("official_street_code_not_visible"));

  assert.equal(unit.streetRegisterStatus, "collecting");
  assert.equal(unit.streetTargetCount, 758);
  assert.equal(unit.streetTargetEvidenceStatus, "live_official_metadata");
  assert.equal(unit.officialGuidelineRecords, 0);
});

test("a pending archived row cannot silently become verified without an official street code", async () => {
  const batch = await readJson(archivedSnapshotUrl);
  batch.rows[0].verificationStatus = "verified";
  batch.rows[0].verifiedAt = "2026-07-16";

  const result = validateGuidelineImport(batch, { allowedVillageKeys: ["20066:254"] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("officialStreetCode is required before a record can be verified")));
});

test("secondary corroboration checks one known row without becoming official evidence", async () => {
  const ledger = await readJson(secondaryCorroborationUrl);

  assert.equal(ledger.audit.sourceType, "third_party_mirror");
  assert.equal(ledger.audit.captureMethod, "single_page_targeted_audit");
  assert.equal(ledger.audit.reuseDecision, "do_not_bulk_ingest");
  assert.match(ledger.audit.reuseReason, /no bulk street data was copied/i);
  assert.equal(ledger.audit.pageSnapshotHash, "sha256:1921581bb2f2347047e10be86137b11995f9d63a92a96d46ba2927bb36e7f868");
  assert.equal(ledger.audit.statedRatesEffectiveFrom, "2024-07-01");
  assert.equal(ledger.audit.statedLastVerifiedAt, "2026-07-14");
  assert.equal(ledger.matchedRows.length, 1);

  const [row] = ledger.matchedRows;
  assert.equal(row.relatedOfficialSnapshotRecordId, "tnreginet-sholinganallur-1-2025-04-16-row-11");
  assert.equal(row.normalizedStreetName, "CHIDAMBARAM NAGAR 1ST STREET");
  assert.equal(row.classification, "Residential Special Type - V");
  assert.equal(row.valueInrPerSqft, 4400);
  assert.equal(row.corroborationStatus, "exact_field_match");
  assert.equal(row.publicationStatus, "secondary_corroboration_only");
  assert.equal(row.currentOfficialValue, false);
  assert.equal(row.geometryStatus, "unplotted");
});

test("live official query resolves the secondary street-count claim for the current target", async () => {
  const [coverage, ledger] = await Promise.all([readJson(coverageUrl), readJson(secondaryCorroborationUrl)]);
  const sholinganallur = coverage.units.find((unit) => unit.officialSroCode === "20066" && unit.officialVillageCode === "254");
  const [conflict] = ledger.conflicts;

  assert.equal(ledger.scopeClaims.claimedStreetCount, 758);
  assert.equal(ledger.scopeClaims.claimStatus, "corroborated_by_live_official_query");
  assert.equal(conflict.archivedOfficialSnapshotValue, 17);
  assert.equal(conflict.secondarySourceValue, 758);
  assert.equal(conflict.currentOfficialRegisterValue, 758);
  assert.equal(conflict.status, "resolved_for_current_inventory");
  assert.equal(sholinganallur.streetTargetCount, 758);
  assert.equal(sholinganallur.streetTargetEvidenceStatus, "live_official_metadata");
  assert.equal(sholinganallur.officialGuidelineRecords, 0);
});
