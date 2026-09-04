import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  kind: text('kind', { enum: ['hiring', 'available'] }).notNull(),
  trade: text('trade').notNull(), title: text('title').notNull(), city: text('city').notNull(), district: text('district').notNull(),
  locationDetail: text('location_detail'), machineType: text('machine_type'), engagement: text('engagement').notNull(), startDate: text('start_date').notNull(),
  durationText: text('duration_text').notNull(), payText: text('pay_text').notNull(), accommodation: text('accommodation').notNull(), description: text('description').notNull(),
  contactName: text('contact_name').notNull(), contactPhone: text('contact_phone').notNull(),
  status: text('status', { enum: ['active', 'contacting', 'filled', 'closed'] }).notNull().default('active'),
  verification: text('verification', { enum: ['self_reported', 'reviewed'] }).notNull().default('self_reported'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_listings_active_region').on(table.status, table.city, table.district, table.expiresAt),
  index('idx_listings_kind_trade').on(table.kind, table.trade),
  index('idx_listings_owner').on(table.ownerId, table.createdAt),
]);

export const contactRequests = sqliteTable('contact_requests', {
  id: text('id').primaryKey(), listingId: text('listing_id').notNull(), requesterId: text('requester_id').notNull(), message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'declined'] }).notNull().default('pending'), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_contact_requests_listing').on(table.listingId, table.createdAt), index('idx_contact_requests_requester').on(table.requesterId, table.createdAt)]);

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(), listingId: text('listing_id').notNull(), reporterId: text('reporter_id').notNull(), reason: text('reason').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_reports_listing').on(table.listingId, table.createdAt)]);

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), requestId: text('request_id').notNull(), senderId: text('sender_id').notNull(), body: text('body').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_messages_request').on(table.requestId, table.createdAt)]);
