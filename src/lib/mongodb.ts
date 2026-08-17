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
  var _mongoConnecting: Promise<{ client: MongoClient; db: Db }> | undefined;
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

async function createConnection(): Promise<{ client: MongoClient; db: Db }> {
  const client = await MongoClient.connect(uri, {
    // M0 free tier allows max 500 connections shared across ALL apps.
    // Keep our pool small to avoid hitting that ceiling.
    maxPoolSize: 3,
    minPoolSize: 1,
    // Atlas M0 clusters auto-pause and need up to 30s to elect a new primary
    // on wake-up. 15s gives them enough time without hanging forever.
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 20_000,
    connectTimeoutMS: 15_000,
    // Automatically retry reads/writes once on transient network errors.
    retryWrites: true,
    retryReads: true,
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

/**
 * Returns true if the cached MongoClient still has a live topology.
 * Evicts the stale client if not, so the next call does a fresh connect.
 */
function isCachedConnectionAlive(): boolean {
  const client = globalThis._mongoClient;
  if (!client) return false;

  // The driver exposes topology state. If there is no known primary
  // (e.g. Atlas M0 paused and came back) we should reconnect.
  try {
    const topology = (client as unknown as { topology?: { description?: { type?: string; servers?: Map<string, unknown> } } }).topology;
    if (!topology || !topology.description) return false;
    const desc = topology.description;
    // "ReplicaSetNoPrimary" or "Unknown" means no writable server
    if (desc.type === "ReplicaSetNoPrimary" || desc.type === "Unknown") {
      return false;
    }
    // If all servers are Unknown, treat as stale
    if (desc.servers) {
      const allUnknown = [...desc.servers.values()].every(
        (s: unknown) => (s as { type?: string }).type === "Unknown"
      );
      if (allUnknown) return false;
    }
  } catch {
    return false;
  }
  return true;
}

function evictStaleConnection() {
  try { globalThis._mongoClient?.close(true); } catch { /* ignore */ }
  globalThis._mongoClient = undefined;
  globalThis._mongoDb = undefined;
}

export async function connectToDatabase() {
  // Return cached live connection immediately — but only if topology is healthy
  if (globalThis._mongoClient && globalThis._mongoDb) {
    if (isCachedConnectionAlive()) {
      return { client: globalThis._mongoClient, db: globalThis._mongoDb };
    }
    // Stale — Atlas likely paused and resumed; evict and reconnect
    console.warn("[MongoDB] Cached connection is stale — reconnecting...");
    evictStaleConnection();
  }

  // Deduplicate concurrent cold-start calls — only one real connect() at a time
  if (globalThis._mongoConnecting) {
    return globalThis._mongoConnecting;
  }

  globalThis._mongoConnecting = createConnection().finally(() => {
    globalThis._mongoConnecting = undefined;
  });

  return globalThis._mongoConnecting;
}
