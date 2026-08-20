/* eslint-disable */
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

async function applyOffset() {
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
    
    // The attendance ID for today's 14-hr shift
    const todayAtt = await db.collection('attendance').findOne({ teacherUid: angelUid, dateStr: '2026-08-17' });
    if (!todayAtt) {
      console.log('No attendance record found for today.');
      return;
    }
    const attendanceId = todayAtt._id.toString();

    const pending = await col.find({ employeeId: angelUid, status: { $in: ['pending', 'partial'] } }).toArray();
    
    for (const group of pending) {
      const deduct = group.remainingHours;
      if (deduct <= 0) continue;

      const newSession = {
        attendanceDateStr: '2026-08-17',
        hours: deduct,
        attendanceId: attendanceId,
        type: 'weekday_ot',
        notes: 'Applied weekday OT',
        recordedAt: new Date().toISOString(),
        recordedBy: 'system'
      };

      const updatedSessions = [...(group.renderedSessions || []), newSession];
      const newRenderedTotal = updatedSessions.reduce((sum, s) => sum + s.hours, 0);
      const newRemaining = Math.max(0, group.requiredHours - newRenderedTotal);
      
      const newStatus = newRemaining <= 0 ? 'completed' : 'partial';

      await col.updateOne(
        { _id: group._id },
        {
          $set: {
            renderedSessions: updatedSessions,
            renderedTotal: parseFloat(newRenderedTotal.toFixed(2)),
            remainingHours: parseFloat(newRemaining.toFixed(2)),
            status: newStatus,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`Applied ${deduct} hrs to offset group ${group.sourceHoliday.dateStr}. Status: ${newStatus}`);
    }
    
  } finally {
    await client.close();
  }
}

applyOffset();
