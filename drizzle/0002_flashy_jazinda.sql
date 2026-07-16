CREATE TABLE `planning_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text,
	`source_id` text NOT NULL,
	`source_record_id` text NOT NULL,
	`record_type` text NOT NULL,
	`official_sro_code` text,
	`official_village_code` text,
	`candidate_village_keys` text NOT NULL,
	`mapping_status` text NOT NULL,
	`decision_status` text NOT NULL,
	`decision_date` text,
	`survey_reference` text,
	`road_references` text NOT NULL,
	`land_use_before` text,
	`land_use_after` text,
	`planning_constraint` text,
	`geometry_status` text NOT NULL,
	`location_evidence` text NOT NULL,
	`summary` text NOT NULL,
	`scope_caveat` text NOT NULL,
	`quality_flags` text NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `planning_source_record_idx` ON `planning_evidence` (`source_id`,`source_record_id`);--> statement-breakpoint
CREATE INDEX `planning_village_idx` ON `planning_evidence` (`official_sro_code`,`official_village_code`);--> statement-breakpoint
CREATE INDEX `planning_mapping_status_idx` ON `planning_evidence` (`mapping_status`);--> statement-breakpoint
ALTER TABLE `source_capture_runs` ADD `blocker_code` text;--> statement-breakpoint
ALTER TABLE `source_capture_runs` ADD `public_message` text;--> statement-breakpoint
ALTER TABLE `source_capture_runs` ADD `next_action` text;