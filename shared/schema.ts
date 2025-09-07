import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const processors = pgTable("processors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // 'stripe', 'paypal', 'square'
  priority: integer("priority").notNull().default(1),
  enabled: boolean("enabled").notNull().default(true),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).notNull().default("100.00"),
  responseTime: integer("response_time").notNull().default(250), // in milliseconds
  config: jsonb("config").notNull().default({}),
  circuitBreakerOpen: boolean("circuit_breaker_open").notNull().default(false),
  lastFailureTime: timestamp("last_failure_time"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(), // 'pending', 'success', 'failed'
  processorId: varchar("processor_id").references(() => processors.id),
  processorTransactionId: text("processor_transaction_id"),
  failureReason: text("failure_reason"),
  processingTime: integer("processing_time"), // in milliseconds
  attemptedProcessors: jsonb("attempted_processors").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const healthMetrics = pgTable("health_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processorId: varchar("processor_id").notNull().references(() => processors.id),
  timestamp: timestamp("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  avgResponseTime: decimal("avg_response_time", { precision: 8, scale: 2 }).notNull().default("0.00"),
  totalTransactions: integer("total_transactions").notNull().default(0),
});

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: text("level").notNull(), // 'info', 'warn', 'error', 'debug'
  message: text("message").notNull(),
  service: text("service").notNull(),
  transactionId: varchar("transaction_id"),
  processorId: varchar("processor_id"),
  metadata: jsonb("metadata").notNull().default({}),
  timestamp: timestamp("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Insert schemas
export const insertProcessorSchema = createInsertSchema(processors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processorTransactionId: true,
  processingTime: true,
});

export const insertHealthMetricSchema = createInsertSchema(healthMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Processor = typeof processors.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;

export type InsertProcessor = z.infer<typeof insertProcessorSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

// Payment request schema
export const paymentRequestSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{2})?$/, "Amount must be a valid decimal"),
  currency: z.string().default("USD"),
  metadata: z.record(z.any()).optional().default({}),
});

export type PaymentRequest = z.infer<typeof paymentRequestSchema>;
