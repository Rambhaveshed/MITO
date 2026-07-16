import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("../data/coverage/omr-corridor.json", import.meta.url);

async function readManifest() {
  return JSON.parse(await readFile(manifestUrl, "utf8"));
}

test("OMR programme has a bounded, source-backed target", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.id, "omr-corridor-2026");
  assert.equal(manifest.source.organization, "Tamil Nadu Registration Department");
  assert.equal(manifest.registrationOffices.length, 6);
  assert.equal(manifest.units.length, 24);
  assert.equal(manifest.status, "collecting");
  assert.match(manifest.publishedCoverageClaim, /2,715 official register items/i);
  assert.match(manifest.publishedCoverageClaim, /zero current values are published/i);
});

test("official OMR jurisdiction identifiers are complete and unique", async () => {
  const manifest = await readManifest();
  const officeCodes = new Set(manifest.registrationOffices.map((office) => office.officialSroCode));
  const unitKeys = manifest.units.map((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}`);
  assert.equal(new Set(unitKeys).size, unitKeys.length);
  assert.deepEqual(manifest.units.map((unit) => unit.sequence), Array.from({ length: 24 }, (_, index) => index + 1));
  assert.ok(manifest.units.every((unit) => officeCodes.has(unit.officialSroCode)));
  assert.ok(manifest.units.every((unit) => unit.jurisdictionStatus === "verified"));
  assert.ok(manifest.units.every((unit) => /^\d+$/.test(unit.officialVillageCode)));
});

test("release gate prevents incomplete evidence from being called complete", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.releaseGate.minimumStreetRegisterCoveragePercent, 100);
  assert.equal(manifest.releaseGate.allowUnknownStreetTotals, false);
  assert.equal(manifest.units.filter((unit) => unit.streetTargetCount === null).length, 0);
  assert.equal(manifest.units.reduce((sum, unit) => sum + unit.streetTargetCount, 0), 2715);
  assert.ok(manifest.units.every((unit) => unit.streetTargetCountAsOf === "2026-07-16"));
  assert.ok(manifest.units.every((unit) => unit.streetTargetEvidenceStatus === "live_official_metadata"));
  assert.ok(manifest.units.every((unit) => unit.streetRegisterStatus === "collecting"));
  assert.ok(manifest.units.every((unit) => unit.officialGuidelinePublicationBlocker === "REDISTRIBUTION_PERMISSION_REQUIRED"));
  assert.ok(manifest.units.every((unit) => unit.streetRegisterStatus !== "verified"));
  assert.ok(manifest.units.every((unit) => unit.officialGuidelineRecords === 0));
  assert.ok(manifest.units.every((unit) => unit.registeredTransactionRecords === 0));
  assert.ok(manifest.units.every((unit) => !Object.hasOwn(unit, "pricePerSqft")));
});
