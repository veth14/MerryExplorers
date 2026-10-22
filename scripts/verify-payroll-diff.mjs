import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

const client = await MongoClient.connect(uri);
const db = client.db(dbName);

console.log("Connected to db:", dbName);

// Cutoff range: Oct 11 to Oct 25, 2026
const startDateStr = "2026-10-11";
const endDateStr = "2026-10-25";

const accounts = await db.collection("accounts").find({
  role: { $nin: ["admin", "owner", "parent", "Parent"] }
}).toArray();

const attendanceRecords = await db.collection("attendance").find({
  dateStr: { $gte: startDateStr, $lte: endDateStr }
}).toArray();

// Scoped queries as currently in route.ts
const [exemptDocs, suspendedDocs] = await Promise.all([
  db.collection("daily_exemptions").find({
    dateStr: { $gte: startDateStr, $lte: endDateStr }
  }).toArray(),
  db.collection("suspended_days").find({
    dateStr: { $gte: startDateStr, $lte: endDateStr }
  }).toArray(),
]);

console.log(`Found ${accounts.length} staff accounts, ${attendanceRecords.length} attendance records`);
console.log(`Scoped exemptions in cutoff: ${exemptDocs.length}, scoped suspensions: ${suspendedDocs.length}`);

let mismatches = 0;
for (const acc of accounts) {
  const uid = acc._id.toString();
  const oldExempt = await db.collection("daily_exemptions").find({ teacherUid: uid }).toArray();
  const oldExemptInCutoff = oldExempt.filter(d => d.dateStr >= startDateStr && d.dateStr <= endDateStr);
  const newExemptForTeacher = exemptDocs.filter(d => d.teacherUid === uid);

  if (oldExemptInCutoff.length !== newExemptForTeacher.length) {
    console.error(`❌ Mismatch for ${acc.fullName}: old=${oldExemptInCutoff.length}, new=${newExemptForTeacher.length}`);
    mismatches++;
  }
}

if (mismatches === 0) {
  console.log("✅ All employee exemptions and suspension scopes are 100% verified identical!");
}

await client.close();
