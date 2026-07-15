CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dedup_hash` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`company` varchar(255) NOT NULL,
	`location` varchar(255),
	`contract_type` varchar(100),
	`salary` varchar(255),
	`publication_date` varchar(100),
	`source` varchar(100),
	`url` text,
	`category` varchar(100),
	`remote_work` varchar(255),
	`experience` varchar(255),
	`sector` varchar(255),
	`short_description` text,
	`skills` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`scan_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_dedup_hash_unique` UNIQUE(`dedup_hash`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`trigger` enum('scheduled','manual','seed') NOT NULL DEFAULT 'scheduled',
	`total_found` int NOT NULL DEFAULT 0,
	`new_jobs` int NOT NULL DEFAULT 0,
	`notes` text,
	`schedule_cron_task_uid` varchar(65),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_title` varchar(255) NOT NULL,
	`keywords` text,
	`location` varchar(255) NOT NULL DEFAULT 'Bordeaux',
	`radius_km` int NOT NULL DEFAULT 20,
	`platforms` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `search_criteria_id` PRIMARY KEY(`id`)
);
