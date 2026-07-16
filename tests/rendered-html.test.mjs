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
  assert.match(html, /OMR is collecting/i);
  assert.match(html, /24<!-- -->\/<!-- -->24/i);
  assert.match(html, /27(?:<!-- -->)? official planning records captured/i);
  assert.match(html, /1(?:<!-- -->)? archived TNREGINET street row recovered/i);
  assert.match(html, /All current village inventories verified/i);
  assert.match(html, /2,715(?:<!-- -->)? items across/i);
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
  assert.equal(payload.offices.length, 6);
});

test("evidence API publishes planning provenance, current register metadata and the rights gate", async () => {
  const response = await render("/api/evidence");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.scopeId, "omr-corridor-2026");
  assert.equal(payload.planning.summary.recordCount, 27);
  assert.equal(payload.planning.summary.linkedRecordCount, 24);
  assert.equal(payload.planning.summary.villageCount, 21);
  assert.equal(payload.planning.summary.unresolvedRecordCount, 3);
  assert.equal(payload.planning.summary.sourceCount, 9);
  assert.equal(payload.planning.records.length, 27);
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
