import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateGuidelineImport } from "../lib/guideline-import.mjs";

const coverageUrl = new URL("../data/coverage/omr-corridor.json", import.meta.url);
const planningUrl = new URL("../data/evidence/omr-planning-records.json", import.meta.url);
const captureUrl = new URL("../data/capture-runs/omr-guideline-2026-07-15.json", import.meta.url);
const schemaUrl = new URL("../data/evidence/guideline-value-import.schema.json", import.meta.url);
const archivedSnapshotUrl = new URL("../data/evidence/omr-guideline-archived-snapshot-2026-07-16.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
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

test("blocked guideline capture is represented as missing evidence, not zero prices", async () => {
  const capture = await readJson(captureUrl);
  assert.equal(capture.status, "blocked");
  assert.equal(capture.recordsSeen, 0);
  assert.equal(capture.recordsAccepted, 0);
  assert.equal(capture.recordsRejected, 0);
  assert.equal(capture.blockerCode, "OFFICIAL_EXPORT_REQUIRED");
  assert.match(capture.notes, /not evidence that the official source has no records/i);
  assert.match(capture.nextAction, /official export|official snapshot/i);
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
  assert.equal(unit.streetTargetCount, 17);
  assert.equal(unit.streetTargetEvidenceStatus, "archived_snapshot");
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
