import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB as string;

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

if (!dbName) {
  throw new Error("Please define the MONGODB_DB environment variable inside .env.local");
}

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
  var _mongoIndexesCreated: boolean | undefined;
}

/**
 * Creates TTL indexes to automatically purge old documents and keep the
 * MongoDB Atlas M0 free-tier (512 MB) from filling up.
 *
 * TTL policy:
 *   attendance  → deleted after 2 years  (730 days)  — keep for payroll history
 *   inquiries   → deleted after 1 year   (365 days)  — after a year it's stale
 *   activity    → deleted after 90 days              — social-feed posts go stale fast
 *   leaves      → deleted after 3 years  (1095 days) — HR records need longer retention
 *
 * `createIndex` is idempotent — safe to call on every cold start.
 * `background: true` means it won't block ongoing queries.
 */
async function ensureTTLIndexes(db: Db): Promise<void> {
  if (globalThis._mongoIndexesCreated) return;

  const DAY = 86_400; // seconds

  await Promise.all([
    db.collection("attendance").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 730 * DAY, background: true, name: "ttl_attendance_2yr" }
    ),
    db.collection("inquiries").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 365 * DAY, background: true, name: "ttl_inquiries_1yr" }
    ),
    db.collection("activity").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 90 * DAY, background: true, name: "ttl_activity_90d" }
    ),
    db.collection("leaves").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 1095 * DAY, background: true, name: "ttl_leaves_3yr" }
    ),
  ]);

  globalThis._mongoIndexesCreated = true;
}

export async function connectToDatabase() {
  // Always use the cached connection to avoid reconnect delays
  if (globalThis._mongoClient && globalThis._mongoDb) {
    return { client: globalThis._mongoClient, db: globalThis._mongoDb };
  }

  const client = await MongoClient.connect(uri, {
    // M0 free tier allows max 500 connections shared across ALL apps.
    // Keep our pool small to avoid hitting that ceiling.
    maxPoolSize: 3,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  const db = client.db(dbName);

  globalThis._mongoClient = client;
  globalThis._mongoDb = db;

  // Set up TTL indexes once per cold start (non-blocking)
  ensureTTLIndexes(db).catch((err) =>
    console.warn("TTL index creation failed (non-fatal):", err)
  );

  return { client, db };
}
