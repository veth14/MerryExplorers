const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);

  const numStudents = await db.collection('students').countDocuments();
  const numAccounts = await db.collection('accounts').countDocuments();
  const numRegistrations = await db.collection('student_registrations').countDocuments();
  const numFamilies = await db.collection('renewal_families').countDocuments();

  console.log({ numStudents, numAccounts, numRegistrations, numFamilies });

  const parentAccounts = await db.collection('accounts').find({}).toArray();
  console.log('All accounts:', parentAccounts.map(a => ({ _id: a._id, email: a.email, role: a.role, name: a.name, childName: a.childName })));

  const allStudents = await db.collection('students').find({}).project({ 'childInfo.firstName': 1, 'childInfo.lastName': 1, 'childInfo.nickname': 1, 'parentInfo.email': 1, 'parentInfo.name': 1, program: 1, programName: 1 }).toArray();
  console.log('Students count:', allStudents.length);
  allStudents.forEach(s => {
    console.log(`- ${s.childInfo?.firstName} ${s.childInfo?.lastName} (${s.childInfo?.nickname}) | Parent: ${s.parentInfo?.name} <${s.parentInfo?.email}> | Program: ${s.programName || s.program}`);
  });

  await client.close();
})();
