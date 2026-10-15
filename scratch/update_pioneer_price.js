const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function update() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'merryexplorers');

  // Update creative-explorer pioneer price from 4885 to 4820
  const result = await db.collection('settings').updateOne(
    { _key: 'pioneer_settings_v1' },
    {
      $set: {
        'pioneerPrices.creative-explorer': 4820,
        updatedAt: new Date().toISOString()
      }
    }
  );
  console.log('Updated:', result.modifiedCount, 'document(s)');

  // Verify
  const doc = await db.collection('settings').findOne({ _key: 'pioneer_settings_v1' });
  console.log('New pioneerPrices:', JSON.stringify(doc.pioneerPrices, null, 2));
  await client.close();
}
update().catch(console.error);
