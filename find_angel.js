/* eslint-disable */
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function findAngel() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let uri = '', dbName = '';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('MONGODB_URI=')) uri = line.substring('MONGODB_URI='.length).trim();
    if (line.startsWith('MONGODB_DB=')) dbName = line.substring('MONGODB_DB='.length).trim();
  });

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName || 'merryexplorers');
    const col = db.collection('attendance');

    // List all records for today
    const today = await col.find({ dateStr: '2026-08-17' }).toArray();
    console.log('Aug 17 records:', JSON.stringify(today, null, 2));

    // Also search by name
    const byName = await col.find({ name: { $regex: /angel/i } }).sort({ dateStr: -1 }).limit(5).toArray();
    console.log('\nBy name (Angel):', JSON.stringify(byName.map(r => ({ _id: r._id, teacherUid: r.teacherUid, name: r.name, dateStr: r.dateStr, clockInTime: r.clockInTime })), null, 2));
  } finally {
    await client.close();
  }
}

findAngel();
