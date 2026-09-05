CREATE TABLE "contact_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"trade" text NOT NULL,
	"title" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"location_detail" text,
	"machine_type" text,
	"engagement" text NOT NULL,
	"start_date" text NOT NULL,
	"duration_text" text NOT NULL,
	"pay_text" text NOT NULL,
	"accommodation" text NOT NULL,
	"description" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"verification" text DEFAULT 'self_reported' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_contact_requests_listing" ON "contact_requests" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_contact_requests_requester" ON "contact_requests" USING btree ("requester_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_listings_active_region" ON "listings" USING btree ("status","city","district","expires_at");--> statement-breakpoint
CREATE INDEX "idx_listings_kind_trade" ON "listings" USING btree ("kind","trade");--> statement-breakpoint
CREATE INDEX "idx_listings_owner" ON "listings" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_request" ON "messages" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_reports_listing" ON "reports" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_phone" ON "users" USING btree ("phone");