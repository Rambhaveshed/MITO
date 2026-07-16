import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coverageUrl = new URL("../data/coverage/chennai-district-revenue-2026-07-16.json", import.meta.url);
const crosswalkUrl = new URL("../data/evidence/chennai-registration-crosswalk-2026-07-17.json", import.meta.url);
const omrCoverageUrl = new URL("../data/coverage/omr-corridor.json", import.meta.url);
const omrInventoryUrl = new URL("../data/evidence/tnreginet-omr-inventory-audit-2026-07-16.json", import.meta.url);

async function readCoverage() {
  return JSON.parse(await readFile(coverageUrl, "utf8"));
}

test("Chennai District expansion preserves the complete preferred source table", async () => {
  const coverage = await readCoverage();
  const sourceVillageCount = coverage.taluks.reduce((sum, taluk) => sum + taluk.villages.length, 0);
  const claimedVillageCount = coverage.taluks.reduce((sum, taluk) => sum + taluk.villageCount, 0);
  const firkaCount = coverage.taluks.reduce((sum, taluk) => sum + taluk.firkaCount, 0);

  assert.equal(coverage.status, "source_inventory");
  assert.equal(coverage.taluks.length, 17);
  assert.equal(sourceVillageCount, 144);
  assert.equal(claimedVillageCount, 144);
  assert.equal(firkaCount, 49);
  assert.ok(coverage.taluks.every((taluk) => taluk.villages.length === taluk.villageCount));
  assert.equal(new Set(coverage.taluks.map((taluk) => taluk.sequence)).size, 17);
});

test("official Chennai source-count conflicts remain explicit and blocking", async () => {
  const coverage = await readCoverage();
  const conflict = coverage.conflicts.find((candidate) => candidate.id === "chennai-revenue-unit-count-conflict-2026-07-17");

  assert.equal(coverage.officialClaims.districtHomepage.taluks, 16);
  assert.equal(coverage.officialClaims.districtHomepage.villages, 122);
  assert.equal(coverage.officialClaims.revenueAdministrationPage.unitSummaryTaluks, 17);
  assert.equal(coverage.officialClaims.revenueAdministrationPage.sectionHeadingTaluks, 16);
  assert.equal(coverage.officialClaims.revenueAdministrationPage.totalVillages, 144);
  assert.equal(coverage.officialClaims.villagePage.listedTalukGroups, 10);
  assert.equal(coverage.officialClaims.villagePage.listedVillages, 68);
  assert.ok(conflict);
  assert.equal(conflict.status, "unresolved");
  assert.ok(conflict.blocks.includes("chennai_complete"));
});

test("Chennai expansion publishes only explicitly verified registration links", async () => {
  const coverage = await readCoverage();

  assert.equal(coverage.publication.geometryStatus, "unplotted");
  assert.equal(coverage.publication.registrationCrosswalkStatus, "partial_verified");
  assert.equal(coverage.publication.verifiedRegistrationCrosswalks, 9);
  assert.equal(coverage.publication.ambiguousRegistrationCrosswalks, 3);
  assert.equal(coverage.publication.officialGuidelineValuesPublished, 0);
  assert.equal(coverage.publication.registeredTransactionsPublished, 0);
  assert.equal(coverage.publication.marketEstimatesPublished, 0);
  assert.match(coverage.publication.caveat, /nine rows have independently verified registration identities/i);
  assert.ok(coverage.sources.every((source) => /^https:\/\//.test(source.url)));
});

test("nine Chennai crosswalks reconcile exactly to the existing official OMR evidence", async () => {
  const [coverage, crosswalk, omrCoverage, omrInventory] = await Promise.all([
    readCoverage(),
    readFile(crosswalkUrl, "utf8").then(JSON.parse),
    readFile(omrCoverageUrl, "utf8").then(JSON.parse),
    readFile(omrInventoryUrl, "utf8").then(JSON.parse),
  ]);
  const sourceRows = new Map(coverage.taluks.flatMap((taluk) => taluk.villages.map((name, index) => [
    `${taluk.sequence}:${index + 1}`,
    { name, talukName: taluk.sourceName },
  ])));
  const omrUnits = new Map(omrCoverage.units.map((unit) => [`${unit.officialSroCode}:${unit.officialVillageCode}`, unit]));
  const inventoryQueries = new Map(omrInventory.queries.map((query) => [`${query.officialSroCode}:${query.officialVillageCode}`, query]));

  assert.equal(crosswalk.records.length, 9);
  assert.equal(crosswalk.summary.verifiedCrosswalkCount, 9);
  assert.equal(crosswalk.summary.currentInventoryItemCount, 2117);
  assert.equal(new Set(crosswalk.records.map((record) => record.chennaiSourceKey)).size, 9);
  assert.equal(new Set(crosswalk.records.map((record) => `${record.officialSroCode}:${record.officialVillageCode}`)).size, 9);

  for (const record of crosswalk.records) {
    const source = sourceRows.get(record.chennaiSourceKey);
    const registrationKey = `${record.officialSroCode}:${record.officialVillageCode}`;
    const omrUnit = omrUnits.get(registrationKey);
    const inventory = inventoryQueries.get(registrationKey);
    assert.ok(source, `missing Chennai source row ${record.chennaiSourceKey}`);
    assert.equal(record.chennaiSourceName, source.name);
    assert.equal(record.chennaiTalukName, source.talukName);
    assert.ok(omrUnit, `missing OMR registration unit ${registrationKey}`);
    assert.ok(inventory, `missing official inventory query ${registrationKey}`);
    assert.equal(record.currentInventoryItemCount, inventory.displayedItemCount);
    assert.equal(record.guidelineVillageName, inventory.guidelineVillageName);
    assert.equal(record.currentOfficialRowsStored, 0);
    assert.equal(record.currentOfficialValuesPublished, 0);
  }

  assert.equal(crosswalk.records.reduce((sum, record) => sum + record.currentInventoryItemCount, 0), 2117);
});

test("Adyar revenue subdivisions remain unresolved rather than sharing one registration ID", async () => {
  const crosswalk = JSON.parse(await readFile(crosswalkUrl, "utf8"));
  const verifiedKeys = new Set(crosswalk.records.map((record) => record.chennaiSourceKey));

  assert.deepEqual(crosswalk.ambiguities.map((record) => record.chennaiSourceKey), ["7:3", "7:5", "7:7"]);
  assert.ok(crosswalk.ambiguities.every((record) => record.status === "unresolved_source_split"));
  assert.ok(crosswalk.ambiguities.every((record) => record.candidateOfficialSroCode === "20051"));
  assert.ok(crosswalk.ambiguities.every((record) => record.candidateOfficialVillageCode === "1"));
  assert.ok(crosswalk.ambiguities.every((record) => !verifiedKeys.has(record.chennaiSourceKey)));
});
