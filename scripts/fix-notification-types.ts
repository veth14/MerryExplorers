/**
 * One-time migration: fix invalid notification types in MongoDB.
 * Run with: npx tsx scripts/fix-notification-types.ts
 */
import { connectToDatabase } from "../src/lib/mongodb";

async function main() {
  const { db } = await connectToDatabase();

  const result = await db.collection("notifications").updateMany(
    { type: "error" },
    { $set: { type: "absent" } }
  );

  console.log(`✅ Updated ${result.modifiedCount} notification(s) from type "error" → "absent".`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
