/* eslint-disable */
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

async function fix() {
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

    // 1. Delete the ghost record with teacherUid "unknown"
    const ghost = await col.deleteMany({ teacherUid: 'unknown' });
    console.log(`Deleted ${ghost.deletedCount} ghost record(s).`);

    // 2. Show all of today's attendance so we can verify Angel's record
    const today = '2026-08-17';
    const records = await col.find({ dateStr: today }).toArray();
    console.log('\nToday\'s attendance records:');
    records.forEach(r => {
      console.log(`  - ${r.name} (${r.teacherUid.substring(0, 8)}...) | In: ${r.clockInTime} | Out: ${r.clockOutTime || 'N/A'} | Status: ${r.timeInStatus}`);
    });

  } finally {
    await client.close();
  }
}

fix();
