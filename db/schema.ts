import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  organization: text("organization").notNull(),
  title: text("title").notNull(),
  category: text("category", { enum: ["official", "planning", "listing", "broker", "user", "map"] }).notNull(),
  url: text("url").notNull(),
  sourceRecordId: text("source_record_id"),
  publicationDate: text("publication_date"),
  effectiveDate: text("effective_date"),
  retrievedAt: text("retrieved_at").notNull(),
  verifiedAt: text("verified_at"),
  redistributionPolicy: text("redistribution_policy"),
  snapshotHash: text("snapshot_hash"),
}, (table) => [uniqueIndex("sources_url_record_idx").on(table.url, table.sourceRecordId)]);

export const places = sqliteTable("places", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  placeType: text("place_type", { enum: ["state", "district", "registration_district", "taluk", "sro", "village", "ward", "locality", "micro_market", "street"] }).notNull(),
  nameEn: text("name_en").notNull(),
  nameTa: text("name_ta"),
  normalizedName: text("normalized_name").notNull(),
  district: text("district"),
  registrationOffice: text("registration_office"),
}, (table) => [
  index("places_parent_idx").on(table.parentId),
  index("places_normalized_name_idx").on(table.normalizedName),
]);

export const geometries = sqliteTable("geometries", {
  id: text("id").primaryKey(),
  placeId: text("place_id").references(() => places.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  geometryType: text("geometry_type", { enum: ["point", "line", "polygon", "unplotted"] }).notNull(),
  geojson: text("geojson"),
  precision: text("precision", { enum: ["exact", "approximate", "inferred", "schematic", "unplotted"] }).notNull(),
  coordinateSourceId: text("coordinate_source_id").references(() => sources.id),
  locationEvidence: text("location_evidence").notNull(),
  positionalUncertaintyMetres: real("positional_uncertainty_metres"),
  verifiedAt: text("verified_at"),
}, (table) => [index("geometries_entity_idx").on(table.entityType, table.entityId)]);

export const priceEvidence = sqliteTable("price_evidence", {
  id: text("id").primaryKey(),
  placeId: text("place_id").references(() => places.id),
  sourceId: text("source_id").notNull().references(() => sources.id),
  propertyType: text("property_type").notNull(),
  evidenceType: text("evidence_type", { enum: ["guideline", "registered_transaction", "asking_price", "broker_reported", "model_estimate", "user_submitted"] }).notNull(),
  priceInr: integer("price_inr"),
  areaSqft: real("area_sqft"),
  pricePerSqft: real("price_per_sqft"),
  evidenceDate: text("evidence_date").notNull(),
  lifecycle: text("lifecycle"),
  grade: text("grade", { enum: ["A", "B", "C", "D", "E"] }).notNull(),
  confidence: real("confidence"),
  plotted: integer("plotted", { mode: "boolean" }).notNull().default(false),
  duplicateGroupId: text("duplicate_group_id"),
  conflictNotes: text("conflict_notes"),
  qualityFlags: text("quality_flags", { mode: "json" }).$type<string[]>(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("price_place_date_idx").on(table.placeId, table.evidenceDate),
  index("price_type_idx").on(table.evidenceType, table.propertyType),
]);

export const verificationEvents = sqliteTable("verification_events", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  status: text("status", { enum: ["pending", "verified", "rejected", "superseded", "conflicted"] }).notNull(),
  method: text("method").notNull(),
  notes: text("notes"),
  verifiedAt: text("verified_at").notNull(),
  modelVersion: text("model_version"),
}, (table) => [index("verification_entity_idx").on(table.entityType, table.entityId)]);

export const coverageScopes = sqliteTable("coverage_scopes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  definition: text("definition").notNull(),
  coverageUnit: text("coverage_unit").notNull(),
  status: text("status", { enum: ["planning", "collecting", "audited", "published"] }).notNull(),
  sourceId: text("source_id").notNull().references(() => sources.id),
  releaseGate: text("release_gate", { mode: "json" }).$type<Record<string, number | boolean>>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const coverageUnits = sqliteTable("coverage_units", {
  id: text("id").primaryKey(),
  scopeId: text("scope_id").notNull().references(() => coverageScopes.id),
  placeId: text("place_id").references(() => places.id),
  officialSroCode: text("official_sro_code").notNull(),
  officialVillageCode: text("official_village_code").notNull(),
  jurisdictionStatus: text("jurisdiction_status", { enum: ["pending", "verified", "rejected", "conflicted"] }).notNull(),
  streetRegisterStatus: text("street_register_status", { enum: ["not_started", "collecting", "captured", "verified", "blocked"] }).notNull(),
  streetTargetCount: integer("street_target_count"),
  officialGuidelineRecords: integer("official_guideline_records").notNull().default(0),
  registeredTransactionRecords: integer("registered_transaction_records").notNull().default(0),
  blocker: text("blocker"),
  verifiedAt: text("verified_at"),
}, (table) => [
  uniqueIndex("coverage_scope_village_idx").on(table.scopeId, table.officialSroCode, table.officialVillageCode),
  index("coverage_scope_status_idx").on(table.scopeId, table.streetRegisterStatus),
]);

export const sourceCaptureRuns = sqliteTable("source_capture_runs", {
  id: text("id").primaryKey(),
  scopeId: text("scope_id").references(() => coverageScopes.id),
  sourceId: text("source_id").notNull().references(() => sources.id),
  method: text("method").notNull(),
  status: text("status", { enum: ["started", "succeeded", "partial", "failed", "blocked"] }).notNull(),
  recordsSeen: integer("records_seen").notNull().default(0),
  recordsAccepted: integer("records_accepted").notNull().default(0),
  recordsRejected: integer("records_rejected").notNull().default(0),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  blockerCode: text("blocker_code"),
  publicMessage: text("public_message"),
  notes: text("notes"),
  nextAction: text("next_action"),
});

export const guidelineValues = sqliteTable("guideline_values", {
  id: text("id").primaryKey(),
  placeId: text("place_id").notNull().references(() => places.id),
  sourceId: text("source_id").notNull().references(() => sources.id),
  captureRunId: text("capture_run_id").references(() => sourceCaptureRuns.id),
  officialSroCode: text("official_sro_code").notNull(),
  officialVillageCode: text("official_village_code").notNull(),
  officialStreetCode: text("official_street_code"),
  sourceStreetName: text("source_street_name").notNull(),
  classification: text("classification"),
  valueInrPerSqft: real("value_inr_per_sqft").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected", "superseded", "conflicted"] }).notNull(),
  verifiedAt: text("verified_at"),
  qualityFlags: text("quality_flags", { mode: "json" }).$type<string[]>(),
}, (table) => [
  index("guideline_place_effective_idx").on(table.placeId, table.effectiveFrom),
  uniqueIndex("guideline_source_record_idx").on(table.sourceId, table.officialSroCode, table.officialVillageCode, table.officialStreetCode, table.effectiveFrom),
]);

export const planningEvidence = sqliteTable("planning_evidence", {
  id: text("id").primaryKey(),
  placeId: text("place_id").references(() => places.id),
  sourceId: text("source_id").notNull().references(() => sources.id),
  sourceRecordId: text("source_record_id").notNull(),
  recordType: text("record_type").notNull(),
  officialSroCode: text("official_sro_code"),
  officialVillageCode: text("official_village_code"),
  candidateVillageKeys: text("candidate_village_keys", { mode: "json" }).$type<string[]>().notNull(),
  mappingStatus: text("mapping_status", { enum: ["verified", "unresolved_registration_subdivision", "unmapped"] }).notNull(),
  decisionStatus: text("decision_status").notNull(),
  decisionDate: text("decision_date"),
  surveyReference: text("survey_reference"),
  roadReferences: text("road_references", { mode: "json" }).$type<string[]>().notNull(),
  landUseBefore: text("land_use_before"),
  landUseAfter: text("land_use_after"),
  planningConstraint: text("planning_constraint"),
  geometryStatus: text("geometry_status", { enum: ["exact", "approximate", "unplotted"] }).notNull(),
  locationEvidence: text("location_evidence").notNull(),
  summary: text("summary").notNull(),
  scopeCaveat: text("scope_caveat").notNull(),
  qualityFlags: text("quality_flags", { mode: "json" }).$type<string[]>().notNull(),
  verifiedAt: text("verified_at").notNull(),
}, (table) => [
  uniqueIndex("planning_source_record_idx").on(table.sourceId, table.sourceRecordId),
  index("planning_village_idx").on(table.officialSroCode, table.officialVillageCode),
  index("planning_mapping_status_idx").on(table.mappingStatus),
]);
