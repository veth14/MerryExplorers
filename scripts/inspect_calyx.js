const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);

  console.log('--- Checking student_registrations for Calyx ---');
  const regs = await db.collection('student_registrations').find({
    $or: [
      { 'parentInfo.email': 'mariel.guian@gmail.com' },
      { 'childInfo.firstName': { $regex: /Calyx/i } }
    ]
  }).toArray();
  console.log('Registrations:', JSON.stringify(regs, null, 2));

  console.log('\n--- Checking renewal_families for Calyx ---');
  const rf = await db.collection('renewal_families').find({
    $or: [
      { parentEmail: 'mariel.guian@gmail.com' },
      { childName: { $regex: /Calyx/i } }
    ]
  }).toArray();
  console.log('Renewal families:', JSON.stringify(rf, null, 2));

  console.log('\n--- Checking payments collection if any ---');
  const payments = await db.collection('payments').find({
    $or: [
      { parentEmail: 'mariel.guian@gmail.com' },
      { studentName: { $regex: /Calyx/i } }
    ]
  }).toArray();
  console.log('Payments:', JSON.stringify(payments, null, 2));

  await client.close();
}
run().catch(console.error);
