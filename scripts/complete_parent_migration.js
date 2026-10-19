const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrateAndClean() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'merryexplorers');

  console.log("=== MIGRATING PARENT ACCOUNTS ===");

  // 1. Fetch parent accounts from accounts
  const parentsInAccounts = await db.collection("accounts").find({
    $or: [{ role: "parent" }, { role: "Parent" }]
  }).toArray();

  console.log(`Found ${parentsInAccounts.length} parent accounts currently in 'accounts' collection:`);
  for (const p of parentsInAccounts) {
    console.log(`  - ${p.fullName} (${p.email}) [UID: ${p._id}]`);
  }

  // 2. Ensure each is upserted into parent_accounts with all fields intact
  for (const p of parentsInAccounts) {
    const { _id, ...doc } = p;
    await db.collection("parent_accounts").updateOne(
      { _id: _id },
      { $set: { ...doc, role: "parent", migratedAt: new Date() } },
      { upsert: true }
    );
  }
  console.log(`✓ All ${parentsInAccounts.length} parents safely stored in 'parent_accounts'.`);

  // 3. Remove them from 'accounts' so accounts collection only holds staff/employees
  const deleteResult = await db.collection("accounts").deleteMany({
    $or: [{ role: "parent" }, { role: "Parent" }]
  });
  console.log(`✓ Removed ${deleteResult.deletedCount} parent accounts from 'accounts' collection.`);

  // 4. Verification
  const remainingInAccounts = await db.collection("accounts").find({}).toArray();
  console.log("\n=== REMAINING IN 'accounts' (STAFF / EMPLOYEES ONLY) ===");
  for (const acc of remainingInAccounts) {
    console.log(`  - ${acc.fullName || acc.name} | Role: ${acc.role} | Email: ${acc.email}`);
  }

  const allInParentAccounts = await db.collection("parent_accounts").find({}).toArray();
  console.log(`\n=== IN 'parent_accounts' (TOTAL: ${allInParentAccounts.length}) ===`);
  for (const p of allInParentAccounts) {
    console.log(`  - ${p.fullName} | Child: ${p.childName || '—'} | Email: ${p.email}`);
  }

  await client.close();
}

migrateAndClean().catch(console.error);
