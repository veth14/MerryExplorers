/* eslint-disable */
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function check() {
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

    const today = '2026-08-17';
    const records = await col.find({ dateStr: today }).toArray();
    console.log('\nFull Angel attendance record today:');
    records.forEach(r => {
      console.log(JSON.stringify(r, null, 2));
    });
  } finally {
    await client.close();
  }
}

check();
