CREATE TABLE `coverage_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`definition` text NOT NULL,
	`coverage_unit` text NOT NULL,
	`status` text NOT NULL,
	`source_id` text NOT NULL,
	`release_gate` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coverage_units` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`place_id` text,
	`official_sro_code` text NOT NULL,
	`official_village_code` text NOT NULL,
	`jurisdiction_status` text NOT NULL,
	`street_register_status` text NOT NULL,
	`street_target_count` integer,
	`official_guideline_records` integer DEFAULT 0 NOT NULL,
	`registered_transaction_records` integer DEFAULT 0 NOT NULL,
	`blocker` text,
	`verified_at` text,
	FOREIGN KEY (`scope_id`) REFERENCES `coverage_scopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverage_scope_village_idx` ON `coverage_units` (`scope_id`,`official_sro_code`,`official_village_code`);--> statement-breakpoint
CREATE INDEX `coverage_scope_status_idx` ON `coverage_units` (`scope_id`,`street_register_status`);--> statement-breakpoint
CREATE TABLE `guideline_values` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text NOT NULL,
	`source_id` text NOT NULL,
	`capture_run_id` text,
	`official_sro_code` text NOT NULL,
	`official_village_code` text NOT NULL,
	`official_street_code` text,
	`source_street_name` text NOT NULL,
	`classification` text,
	`value_inr_per_sqft` real NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`verification_status` text NOT NULL,
	`verified_at` text,
	`quality_flags` text,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`capture_run_id`) REFERENCES `source_capture_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `guideline_place_effective_idx` ON `guideline_values` (`place_id`,`effective_from`);--> statement-breakpoint
CREATE UNIQUE INDEX `guideline_source_record_idx` ON `guideline_values` (`source_id`,`official_sro_code`,`official_village_code`,`official_street_code`,`effective_from`);--> statement-breakpoint
CREATE TABLE `source_capture_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text,
	`source_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`records_seen` integer DEFAULT 0 NOT NULL,
	`records_accepted` integer DEFAULT 0 NOT NULL,
	`records_rejected` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`notes` text,
	FOREIGN KEY (`scope_id`) REFERENCES `coverage_scopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
