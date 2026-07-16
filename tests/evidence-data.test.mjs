import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateGuidelineImport } from "../lib/guideline-import.mjs";

const coverageUrl = new URL("../data/coverage/omr-corridor.json", import.meta.url);
const planningUrl = new URL("../data/evidence/omr-planning-records.json", import.meta.url);
const captureUrl = new URL("../data/capture-runs/omr-guideline-2026-07-15.json", import.meta.url);
const schemaUrl = new URL("../data/evidence/guideline-value-import.schema.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

test("official planning records stay parcel-specific and source-backed", async () => {
  const ledger = await readJson(planningUrl);
  const sourceIds = new Set(ledger.sources.map((source) => source.id));
  const recordIds = ledger.records.map((record) => record.id);

  assert.equal(ledger.records.length, 8);
  assert.equal(new Set(recordIds).size, recordIds.length);
  assert.ok(ledger.records.every((record) => sourceIds.has(record.sourceId)));
  assert.ok(ledger.records.every((record) => record.scopeCaveat.length > 40));
  assert.ok(ledger.records.every((record) => record.geometryStatus === "unplotted"));
  assert.ok(ledger.records.every((record) => !Object.hasOwn(record, "pricePerSqft")));
  assert.match(ledger.coverageCaveat, /do not prove that every parcel/i);
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
      assert.ok(record.candidateVillageKeys.length > 1);
      assert.ok(record.candidateVillageKeys.every((key) => unitKeys.has(key)));
    }
  }
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
  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.ok(schema.properties.source.required.includes("snapshotHash"));
  const required = schema.properties.rows.items.required;
  for (const field of ["officialStreetCode", "sourceStreetName", "classification", "rawValueInr", "rawValueUnit", "valueInrPerSqft", "effectiveFrom", "locationEvidence"]) {
    assert.ok(required.includes(field), `${field} must be required`);
  }
});

test("guideline import validator accepts a fully traceable in-scope row", () => {
  const batch = {
    schemaVersion: "1.0.0",
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
    schemaVersion: "1.0.0",
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
