const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('test');
  
  const accs = await db.collection('accounts').find({ role: 'parent' }).toArray();
  accs.forEach(a => console.log('Name:', a.fullName, 'Child:', a.childName, 'V:', a.virtualSessionsCompleted));
  
  // Set all to 1 for testing
  await db.collection('accounts').updateMany({ role: 'parent' }, { $set: { virtualSessionsCompleted: 1 } });
  console.log('Fixed!');

  await client.close();
})();
