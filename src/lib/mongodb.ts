import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB as string;

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

if (!dbName) {
  throw new Error("Please define the MONGODB_DB environment variable inside .env.local");
}

let client: MongoClient;
let db: Db;

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
}

export async function connectToDatabase() {
  if (globalThis._mongoClient && globalThis._mongoDb) {
    return { client: globalThis._mongoClient, db: globalThis._mongoDb };
  }

  client = await MongoClient.connect(uri);
  db = client.db(dbName);

  if (process.env.NODE_ENV !== "production") {
    globalThis._mongoClient = client;
    globalThis._mongoDb = db;
  }

  return { client, db };
}
