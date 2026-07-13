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
}

export async function connectToDatabase() {
  // Always use the cached connection to avoid reconnect delays
  if (globalThis._mongoClient && globalThis._mongoDb) {
    return { client: globalThis._mongoClient, db: globalThis._mongoDb };
  }

  const client = await MongoClient.connect(uri, {
    maxPoolSize: 10,        // Allow up to 10 simultaneous connections
    minPoolSize: 2,         // Keep 2 connections warm
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  });
  const db = client.db(dbName);

  globalThis._mongoClient = client;
  globalThis._mongoDb = db;

  return { client, db };
}

