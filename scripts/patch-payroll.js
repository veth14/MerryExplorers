const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb+srv://vianangelo14_db_user:Yr7N4zbmhrWgcfSE@merryexplorerscluster.ji3nrss.mongodb.net/merryexplorers?appName=MerryExplorersCluster";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('merryexplorers');

  // Show ALL accounts and their current payroll fields
  const all = await db.collection('accounts')
    .find({})
    .project({ fullName: 1, role: 1, monthlyRate: 1, dailyRate: 1, hourlyRate: 1 })
    .toArray();

  console.log("ALL accounts in DB:");
  console.log(JSON.stringify(all, null, 2));

  await client.close();
}

run().catch(console.error);
