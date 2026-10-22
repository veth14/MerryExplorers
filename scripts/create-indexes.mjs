/**
 * scripts/create-indexes.mjs
 *
 * One-off script to create all performance indexes on MongoDB Atlas.
 * Run ONCE with:
 *   node --env-file=.env.local scripts/create-indexes.mjs
 *
 * createIndex() is idempotent — safe to re-run. It's deliberately NOT
 * wired into the app's cold-start path (ensureTTLIndexes) to avoid
 * adding overhead to every function initialisation.
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
  console.error("❌ Missing MONGODB_URI or MONGODB_DB in environment.");
  process.exit(1);
}

const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 15_000 });
const db = client.db(dbName);

console.log(`✅ Connected to database: ${dbName}`);

const indexes = [
  // student_registrations — the heaviest queried collection
  {
    col: "student_registrations",
    spec: { status: 1, submittedAt: -1 },
    opts: { name: "idx_status_submittedAt", background: true },
  },
  {
    col: "student_registrations",
    spec: { "parentInfo.email": 1 },
    opts: { name: "idx_parentEmail", background: true },
  },
  {
    col: "student_registrations",
    spec: { adventureNumber: 1, status: 1 },
    opts: { name: "idx_adventure_status", background: true },
  },
  {
    col: "student_registrations",
    spec: { "childInfo.firstName": 1, "childInfo.lastName": 1 },
    opts: { name: "idx_childName", background: true },
  },

  // attendance — used heavily by payroll and daily admin view
  {
    col: "attendance",
    spec: { dateStr: 1, teacherUid: 1 },
    opts: { name: "idx_dateStr_teacherUid", background: true },
  },
  {
    col: "attendance",
    spec: { teacherUid: 1, dateStr: -1 },
    opts: { name: "idx_teacherUid_dateStr", background: true },
  },

  // renewal_families
  {
    col: "renewal_families",
    spec: { parentEmail: 1 },
    opts: { name: "idx_parentEmail", background: true },
  },
  {
    col: "renewal_families",
    spec: { renewalStatus: 1 },
    opts: { name: "idx_renewalStatus", background: true },
  },

  // students
  {
    col: "students",
    spec: { "parentInfo.email": 1 },
    opts: { name: "idx_parentEmail", background: true },
  },
  {
    col: "students",
    spec: { "childInfo.firstName": 1, "childInfo.lastName": 1 },
    opts: { name: "idx_childName", background: true },
  },

  // pioneer_families — queried on every renewals load
  {
    col: "pioneer_families",
    spec: { email: 1 },
    opts: { name: "idx_email", background: true },
  },
  {
    col: "pioneer_families",
    spec: { email2: 1 },
    opts: { name: "idx_email2", background: true },
  },
];

let created = 0;
let skipped = 0;

for (const { col, spec, opts } of indexes) {
  try {
    await db.collection(col).createIndex(spec, opts);
    console.log(`  ✅ ${col} → ${opts.name}`);
    created++;
  } catch (err) {
    if (err.codeName === "IndexAlreadyExists" || err.code === 85 || err.code === 86) {
      console.log(`  ⏭️  ${col} → ${opts.name} (already exists)`);
      skipped++;
    } else {
      console.error(`  ❌ ${col} → ${opts.name}: ${err.message}`);
    }
  }
}

console.log(`\n📊 Done: ${created} created, ${skipped} skipped.`);
await client.close();
