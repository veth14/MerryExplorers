const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'merryexplorers');

  const parentAccounts = await db.collection('accounts').find({
    $or: [{ role: 'parent' }, { role: 'Parent' }]
  }).toArray();

  console.log('Parent accounts count in accounts:', parentAccounts.length);
  for (const a of parentAccounts) {
    console.log({
      _id: a._id,
      email: a.email,
      fullName: a.fullName,
      childName: a.childName,
      program: a.program,
      role: a.role
    });
  }

  const existingInParentAccounts = await db.collection('parent_accounts').find({}).toArray();
  console.log('Existing count in parent_accounts collection:', existingInParentAccounts.length);

  await client.close();
}

run().catch(console.error);
