/**
 * fix-sep28-attendance.mjs
 *
 * One-shot migration: re-evaluate every attendance record for 2026-09-28
 * against the NEW schedule (start 09:30, grace until 09:45).
 *
 * Any record stored as "Late" that clocked in at or before 09:45 AM Manila
 * time is corrected to "On Time".
 *
 * Safe to re-run — already-correct records are untouched.
 *
 * Run with:
 *   node scripts/fix-sep28-attendance.mjs
 */

import { MongoClient } from "mongodb";

const MONGODB_URI =
  "mongodb+srv://vianangelo14_db_user:Yr7N4zbmhrWgcfSE@merryexplorerscluster.ji3nrss.mongodb.net/?appName=MerryExplorersCluster";
const MONGODB_DB = "merryexplorers";

const TARGET_DATE = "2026-09-28";

// New schedule effective from TARGET_DATE
const NEW_GRACE_HOUR = 9;
const NEW_GRACE_MIN = 45; // 09:45 Manila — on-time threshold

/**
 * Converts a clockInTime ISO string to Manila local hour/minute.
 */
function toManilaHHMM(isoString) {
  const d = new Date(isoString);
  const manilaStr = d.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manila = new Date(manilaStr);
  return { h: manila.getHours(), m: manila.getMinutes() };
}

/**
 * Returns "On Time" if the clock-in is at or before 09:45 Manila,
 * "Late" otherwise.
 */
function computeNewStatus(clockInISO) {
  const { h, m } = toManilaHHMM(clockInISO);
  const totalMinutes = h * 60 + m;
  const graceMinutes = NEW_GRACE_HOUR * 60 + NEW_GRACE_MIN; // 585
  return totalMinutes <= graceMinutes ? "On Time" : "Late";
}

async function main() {
  console.log(`\n=== MerryExplorers - Fix Sep 28 Attendance ===`);
  console.log(`Target date : ${TARGET_DATE}`);
  console.log(`New schedule: start 09:30, grace until 09:45 Manila\n`);

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });

  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db(MONGODB_DB);
  const col = db.collection("attendance");

  // Fetch ALL records for today (regardless of current status)
  const records = await col
    .find({ dateStr: TARGET_DATE })
    .toArray();

  console.log(`Found ${records.length} attendance record(s) for ${TARGET_DATE}\n`);

  if (records.length === 0) {
    console.log("Nothing to do - no records for today yet.");
    await client.close();
    return;
  }

  let updated = 0;
  let alreadyCorrect = 0;
  let skipped = 0;

  for (const rec of records) {
    const name = rec.teacherName ?? rec.teacherUid ?? rec._id;

    if (!rec.clockInTime) {
      console.log(`  SKIP  ${name} - no clockInTime`);
      skipped++;
      continue;
    }

    if (rec.timeInStatus === "Exempt") {
      console.log(`  SKIP  ${name} - Exempt`);
      skipped++;
      continue;
    }

    const correctStatus = computeNewStatus(rec.clockInTime);
    const { h, m } = toManilaHHMM(rec.clockInTime);
    const timeLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} Manila`;

    if (rec.timeInStatus === correctStatus) {
      console.log(`  OK    ${name} - already "${correctStatus}" (clocked in ${timeLabel})`);
      alreadyCorrect++;
      continue;
    }

    // Need to update
    await col.updateOne(
      { _id: rec._id },
      { $set: { timeInStatus: correctStatus } }
    );
    console.log(
      `  FIXED ${name} - "${rec.timeInStatus}" -> "${correctStatus}" (clocked in ${timeLabel})`
    );
    updated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Updated        : ${updated}`);
  console.log(`  Already correct: ${alreadyCorrect}`);
  console.log(`  Skipped        : ${skipped}`);
  console.log(`  Total records  : ${records.length}`);

  await client.close();
  console.log("\nDone. Connection closed.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
