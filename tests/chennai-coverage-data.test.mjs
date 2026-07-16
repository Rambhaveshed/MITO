import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coverageUrl = new URL("../data/coverage/chennai-district-revenue-2026-07-16.json", import.meta.url);

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

test("Chennai expansion never promotes source names into prices, geometry or registration IDs", async () => {
  const coverage = await readCoverage();

  assert.equal(coverage.publication.geometryStatus, "unplotted");
  assert.equal(coverage.publication.registrationCrosswalkStatus, "not_started");
  assert.equal(coverage.publication.officialGuidelineValuesPublished, 0);
  assert.equal(coverage.publication.registeredTransactionsPublished, 0);
  assert.equal(coverage.publication.marketEstimatesPublished, 0);
  assert.match(coverage.publication.caveat, /does not establish a registration village/i);
  assert.ok(coverage.sources.every((source) => /^https:\/\//.test(source.url)));
});
