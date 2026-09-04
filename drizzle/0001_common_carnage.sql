CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_messages_request` ON `messages` (`request_id`,`created_at`);