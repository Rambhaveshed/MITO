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
