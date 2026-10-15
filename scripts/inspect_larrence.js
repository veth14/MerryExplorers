const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);

  console.log('--- Larrence Scott student_registrations ---');
  const regs = await db.collection('student_registrations').find({
    $or: [
      { 'parentInfo.email': 'jcawaling28@gmail.com' },
      { 'childInfo.firstName': { $regex: /Larrence/i } }
    ]
  }).toArray();
  console.log('Registrations:', JSON.stringify(regs.map(r => ({
    id: r._id,
    childName: `${r.childInfo?.firstName} ${r.childInfo?.lastName}`,
    email: r.parentInfo?.email,
    period: r.period,
    program: r.program,
    submittedAt: r.submittedAt
  })), null, 2));

  console.log('\n--- Larrence Scott renewal_families ---');
  const rf = await db.collection('renewal_families').find({
    $or: [
      { parentEmail: 'jcawaling28@gmail.com' },
      { childName: { $regex: /Larrence/i } }
    ]
  }).toArray();
  console.log('Renewal family:', JSON.stringify(rf, null, 2));

  console.log('\n--- Renewal Settings ---');
  const rs = await db.collection('settings').findOne({ _key: 'renewal_settings_v2' });
  console.log('Programs in renewal_settings_v2:', JSON.stringify(rs?.programs, null, 2));

  await client.close();
}
run().catch(console.error);
