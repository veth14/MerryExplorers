/* eslint-disable */
const fs = require('fs');
const { MongoClient } = require('mongodb');

async function fixFinal() {
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

    const angelUid = '2d8awT4sBJTt9qMIdG9QF5tEfoo1';
    const dateStr  = '2026-08-17';

    // 7:02 AM Manila = 2026-08-16T23:02:16.438Z UTC
    const clockInTime  = '2026-08-16T23:02:16.438Z';
    // 9:11 PM Manila = 2026-08-17T13:11:17.270Z UTC
    const clockOutTime = '2026-08-17T13:11:17.270Z';

    const result = await col.updateOne(
      { teacherUid: angelUid, dateStr },
      {
        $set: {
          clockInTime,
          clockOutTime,
          timeInStatus: 'On Time',  // 7:02 AM is before 8:30 AM
          status: 'Completed',
          createdAt: new Date(clockInTime),
          updatedAt: new Date(),
        }
      }
    );
    console.log(`Modified ${result.modifiedCount} record.`);

    const updated = await col.findOne({ teacherUid: angelUid, dateStr });
    const manilaIn  = new Date(updated.clockInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: true });
    const manilaOut = new Date(updated.clockOutTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour12: true });
    const diffMs    = new Date(updated.clockOutTime) - new Date(updated.clockInTime);
    const totalHrs  = (diffMs / 3600000).toFixed(2);

    console.log(`\n  Name:       ${updated.name}`);
    console.log(`  Clock In:   ${manilaIn}`);
    console.log(`  Clock Out:  ${manilaOut}`);
    console.log(`  Raw Hours:  ${totalHrs} hrs`);
    console.log(`  TimeStatus: ${updated.timeInStatus}`);
    console.log(`  Overall:    ${updated.status}`);
  } finally {
    await client.close();
  }
}

fixFinal();
