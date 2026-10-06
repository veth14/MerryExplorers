/**
 * fix_attendance.cjs
 *
 * Run from your project root (the folder with package.json and .env.local):
 *
 *   node fix_attendance.cjs                  -> PREVIEW only, writes nothing
 *   node fix_attendance.cjs --apply          -> saves the changes (after backing them up)
 *   node fix_attendance.cjs --collection=xyz -> if your collection isn't named "attendance"
 *
 * What it does
 *   Re-checks `timeInStatus` ("On Time" / "Late") on every attendance record
 *   dated 2026-09-28 or later, using the NEW schedule with NO grace period:
 *       Mon / Wed        on time if clocked in by 9:00 AM
 *       Tue / Thu / Fri  on time if clocked in by 11:00 AM
 *       Sat              on time if clocked in by 10:00 AM
 *   (compared to the minute, Manila time). Only wrong records are changed.
 *   Records already marked "Exempt" and Sundays are left alone.
 *   Only `timeInStatus` is changed — nothing else on the record.
 *
 *   With --apply, the original versions of the records it changes are first
 *   copied to a backup collection named "<collection>_timeInStatus_backup".
 *
 * The connection string is read from .env.local (or .env): MONGODB_URI,
 * MONGO_URI or MONGODB_URL. The database name is read from MONGODB_DB /
 * MONGODB_DB_NAME if set, otherwise from the connection string.
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// ── Settings ─────────────────────────────────────────────────────────────────
const FROM_DATE = "2026-09-29"; // new schedule start date
// Start time per day of week (0 = Sun ... 6 = Sat), Manila time. No grace period.
const START = { 1: "09:00", 2: "11:00", 3: "09:00", 4: "11:00", 5: "11:00", 6: "10:00" };

const APPLY = process.argv.includes("--apply");
const collArg = process.argv.find((a) => a.startsWith("--collection="));
const COLLECTION = collArg ? collArg.split("=")[1] : process.env.ATTENDANCE_COLLECTION || "attendance";

// ── Read .env.local / .env (no extra packages needed) ────────────────────────
function loadEnvFile(file) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;
const DB_NAME = process.env.MONGODB_DB || process.env.MONGODB_DB_NAME || undefined;

const toMins = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function main() {
  if (!URI) {
    console.error("Could not find a MongoDB connection string (MONGODB_URI) in .env.local or .env.");
    console.error("Make sure you run this from the project root, and check the variable name used in src/lib/mongodb.ts.");
    process.exit(1);
  }

  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();

  try {
    const db = DB_NAME ? client.db(DB_NAME) : client.db();
    console.log("Database: " + db.databaseName);

    const names = (await db.listCollections().toArray()).map((c) => c.name);
    if (!names.includes(COLLECTION)) {
      console.error('Collection "' + COLLECTION + '" was not found in this database.');
      console.error("Collections here: " + (names.join(", ") || "(none)"));
      console.error("Re-run with --collection=<name>, or set MONGODB_DB if this is the wrong database.");
      process.exit(1);
    }

    const col = db.collection(COLLECTION);
    const docs = await col
      .find({ dateStr: { $gte: FROM_DATE }, clockInTime: { $exists: true, $ne: null } })
      .toArray();

    const changes = [];
    let alreadyCorrect = 0, skippedExempt = 0, skippedSunday = 0, skippedBadDate = 0;

    for (const doc of docs) {
      if (doc.timeInStatus === "Exempt") { skippedExempt++; continue; }

      const clockIn = new Date(doc.clockInTime);
      if (isNaN(clockIn.getTime())) { skippedBadDate++; continue; }

      // Manila is UTC+8 with no daylight saving, so shift by 8 hours and read as UTC
      const manila = new Date(clockIn.getTime() + 8 * 60 * 60 * 1000);
      const day = manila.getUTCDay();
      if (day === 0) { skippedSunday++; continue; }

      const minutes = manila.getUTCHours() * 60 + manila.getUTCMinutes(); // seconds ignored
      const correct = minutes <= toMins(START[day]) ? "On Time" : "Late";

      if (doc.timeInStatus === correct) { alreadyCorrect++; continue; }
      changes.push({ doc, from: doc.timeInStatus, to: correct });
    }

    console.log("Collection: " + COLLECTION);
    console.log("Records dated " + FROM_DATE + " or later: " + docs.length);
    console.log("Already correct: " + alreadyCorrect);
    console.log("Skipped (Exempt): " + skippedExempt + ", (Sunday): " + skippedSunday + ", (bad clockInTime): " + skippedBadDate);
    console.log("Need fixing: " + changes.length + "\n");

    for (const c of changes) {
      console.log(
        c.doc.dateStr + "  " + String(c.doc.name).padEnd(24) + " " +
        String(c.from === undefined ? "(none)" : c.from).padEnd(8) + " -> " + c.to
      );
    }

    if (changes.length === 0) {
      console.log("\nNothing to fix.");
      return;
    }
    if (!APPLY) {
      console.log("\nPREVIEW ONLY — nothing was written. Run again with --apply to save these changes.");
      return;
    }

    const backupName = COLLECTION + "_timeInStatus_backup";
    await db.collection(backupName).insertMany(
      changes.map((c) => ({ backedUpAt: new Date(), original: c.doc }))
    );
    console.log("\nBacked up " + changes.length + " original records to '" + backupName + "'.");

    const result = await col.bulkWrite(
      changes.map((c) => ({
        updateOne: { filter: { _id: c.doc._id }, update: { $set: { timeInStatus: c.to } } },
      }))
    );
    console.log("Updated " + result.modifiedCount + " records.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
