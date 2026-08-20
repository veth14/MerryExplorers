/* eslint-disable */
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function checkOffsets() {
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
    const col = db.collection('offsets');

    const angelUid = '2d8awT4sBJTt9qMIdG9QF5tEfoo1';
    const pending = await col.find({ employeeId: angelUid, status: { $in: ['pending', 'partial'] } }).toArray();
    
    console.log('Angel pending offsets:');
    console.log(JSON.stringify(pending, null, 2));

  } finally {
    await client.close();
  }
}

checkOffsets();
