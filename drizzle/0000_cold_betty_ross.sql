CREATE TABLE `contact_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contact_requests_listing` ON `contact_requests` (`listing_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contact_requests_requester` ON `contact_requests` (`requester_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`trade` text NOT NULL,
	`title` text NOT NULL,
	`city` text NOT NULL,
	`district` text NOT NULL,
	`location_detail` text,
	`machine_type` text,
	`engagement` text NOT NULL,
	`start_date` text NOT NULL,
	`duration_text` text NOT NULL,
	`pay_text` text NOT NULL,
	`accommodation` text NOT NULL,
	`description` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`verification` text DEFAULT 'self_reported' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_listings_active_region` ON `listings` (`status`,`city`,`district`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_listings_kind_trade` ON `listings` (`kind`,`trade`);--> statement-breakpoint
CREATE INDEX `idx_listings_owner` ON `listings` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_listing` ON `reports` (`listing_id`,`created_at`);