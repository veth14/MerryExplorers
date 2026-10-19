const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'merryexplorers');

  console.log("Connected to MongoDB:", db.databaseName);

  // 1. Find all parent accounts in the accounts collection
  const parentAccounts = await db.collection("accounts").find({
    $or: [{ role: "parent" }, { role: "Parent" }]
  }).toArray();

  console.log(`Found ${parentAccounts.length} parent accounts in 'accounts' collection.`);

  // 2. Upsert each into parent_accounts collection
  let migratedCount = 0;
  for (const acc of parentAccounts) {
    const { _id, ...rest } = acc;
    await db.collection("parent_accounts").updateOne(
      { _id: _id },
      { $set: { ...rest, updatedAt: new Date() } },
      { upsert: true }
    );
    migratedCount++;
    console.log(`✓ Migrated parent account: ${acc.fullName} (${acc.email}) -> [parent_accounts]`);
  }

  // 3. Verify parent_accounts collection count
  const totalInNewCol = await db.collection("parent_accounts").countDocuments();
  console.log(`\nMigration completed! Total records in 'parent_accounts': ${totalInNewCol}`);

  await client.close();
}

migrate().catch(console.error);
