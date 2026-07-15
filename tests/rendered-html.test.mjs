import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
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
  assert.match(html, /Search street, locality, survey no\./i);
  assert.match(html, /Coverage is partial/i);
  assert.match(html, /Advertised asking price aggregate/i);
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

test("database schema separates sources, places, geometry and price evidence", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const entity of ["sources", "places", "geometries", "price_evidence", "verification_events"]) {
    assert.match(schema, new RegExp(`sqliteTable\\(\\\"${entity}\\\"`));
  }
  assert.match(schema, /evidence_type/);
  assert.match(schema, /registered_transaction/);
  assert.match(schema, /positional_uncertainty_metres/);
});
