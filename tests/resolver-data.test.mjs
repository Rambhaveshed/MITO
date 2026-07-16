import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const coverageUrl = new URL("../data/coverage/omr-corridor.json", import.meta.url);
const aliasesUrl = new URL("../data/evidence/omr-place-aliases.json", import.meta.url);
const inventoryUrl = new URL("../data/evidence/tnreginet-omr-inventory-audit-2026-07-16.json", import.meta.url);

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase("en-IN").replace(/[\s\-_.(),/]+/g, "").trim();
}

test("OMR place resolver has one source-backed alias set for every coverage unit", async () => {
  const [coverage, aliases, inventory] = await Promise.all([
    readJson(coverageUrl),
    readJson(aliasesUrl),
    readJson(inventoryUrl),
  ]);
  const coverageKeys = coverage.units.map((unit) => `${unit.officialSroCode}:${unit.officialVillageCode}`);
  const aliasKeys = aliases.unitAliases.map((entry) => `${entry.officialSroCode}:${entry.officialVillageCode}`);

  assert.equal(aliases.scopeId, coverage.id);
  assert.equal(aliases.unitAliases.length, 24);
  assert.deepEqual(new Set(aliasKeys), new Set(coverageKeys));
  assert.ok(aliases.unitAliases.every((entry) => entry.aliases.length >= 2));

  for (const query of inventory.queries) {
    const entry = aliases.unitAliases.find(
      (candidate) => candidate.officialSroCode === query.officialSroCode && candidate.officialVillageCode === query.officialVillageCode,
    );
    assert.ok(entry, `missing alias entry for ${query.officialSroCode}:${query.officialVillageCode}`);
    assert.ok(
      entry.aliases.some((alias) => normalize(alias.value) === normalize(query.guidelineVillageName)),
      `${query.guidelineVillageName} must remain searchable as a TNREGINET label`,
    );
  }
});

test("unit aliases are deterministic and ambiguous names are explicit", async () => {
  const aliases = await readJson(aliasesUrl);
  const aliasOwners = new Map();

  for (const entry of aliases.unitAliases) {
    const key = `${entry.officialSroCode}:${entry.officialVillageCode}`;
    for (const alias of entry.aliases) {
      const normalized = normalize(alias.value);
      const owner = aliasOwners.get(normalized);
      assert.ok(!owner || owner === key, `${alias.value} cannot silently point to ${owner} and ${key}`);
      aliasOwners.set(normalized, key);
    }
  }

  assert.deepEqual(
    aliases.ambiguousTerms.find((term) => term.value === "Sholinganallur").candidateVillageKeys,
    ["20066:254", "20066:20514"],
  );
  assert.deepEqual(
    aliases.ambiguousTerms.find((term) => term.value === "Thaiyur").candidateVillageKeys,
    ["22605:800000289", "22605:800000290"],
  );
});

test("unresolved Kalipattur naming conflict is never promoted to a village alias", async () => {
  const aliases = await readJson(aliasesUrl);
  const allUnitAliases = aliases.unitAliases.flatMap((entry) => entry.aliases.map((alias) => normalize(alias.value)));
  const excluded = aliases.excludedTerms.find((term) => normalize(term.value) === normalize("Kalipattur"));

  assert.ok(excluded);
  assert.match(excluded.reason, /does not merge/i);
  assert.ok(!allUnitAliases.includes(normalize("Kalipattur")));
});
