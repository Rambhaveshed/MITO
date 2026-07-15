CREATE TABLE `geometries` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`geometry_type` text NOT NULL,
	`geojson` text,
	`precision` text NOT NULL,
	`coordinate_source_id` text,
	`location_evidence` text NOT NULL,
	`positional_uncertainty_metres` real,
	`verified_at` text,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coordinate_source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `geometries_entity_idx` ON `geometries` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`place_type` text NOT NULL,
	`name_en` text NOT NULL,
	`name_ta` text,
	`normalized_name` text NOT NULL,
	`district` text,
	`registration_office` text
);
--> statement-breakpoint
CREATE INDEX `places_parent_idx` ON `places` (`parent_id`);--> statement-breakpoint
CREATE INDEX `places_normalized_name_idx` ON `places` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `price_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text,
	`source_id` text NOT NULL,
	`property_type` text NOT NULL,
	`evidence_type` text NOT NULL,
	`price_inr` integer,
	`area_sqft` real,
	`price_per_sqft` real,
	`evidence_date` text NOT NULL,
	`lifecycle` text,
	`grade` text NOT NULL,
	`confidence` real,
	`plotted` integer DEFAULT false NOT NULL,
	`duplicate_group_id` text,
	`conflict_notes` text,
	`quality_flags` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `price_place_date_idx` ON `price_evidence` (`place_id`,`evidence_date`);--> statement-breakpoint
CREATE INDEX `price_type_idx` ON `price_evidence` (`evidence_type`,`property_type`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`organization` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`url` text NOT NULL,
	`source_record_id` text,
	`publication_date` text,
	`effective_date` text,
	`retrieved_at` text NOT NULL,
	`verified_at` text,
	`redistribution_policy` text,
	`snapshot_hash` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_url_record_idx` ON `sources` (`url`,`source_record_id`);--> statement-breakpoint
CREATE TABLE `verification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text NOT NULL,
	`method` text NOT NULL,
	`notes` text,
	`verified_at` text NOT NULL,
	`model_version` text
);
--> statement-breakpoint
CREATE INDEX `verification_entity_idx` ON `verification_events` (`entity_type`,`entity_id`);