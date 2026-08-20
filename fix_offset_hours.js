/* eslint-disable */
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

async function fixDoubleCount() {
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
    const todayAtt = await db.collection('attendance').findOne({ teacherUid: angelUid, dateStr: '2026-08-17' });
    if (!todayAtt) { console.log('No attendance record!'); return; }
    const attendanceId = todayAtt._id.toString();

    // Actual OT: pre-shift (7:02 → 8:30) + post-shift (5:30 → 9:11)
    const shiftStart = new Date('2026-08-17T00:30:00.000Z'); // 8:30 AM Manila
    const shiftEnd   = new Date('2026-08-17T09:30:00.000Z'); // 5:30 PM Manila
    const clockIn    = new Date(todayAtt.clockInTime);
    const clockOut   = new Date(todayAtt.clockOutTime);

    const preShiftHrs  = parseFloat(Math.max(0, (shiftStart - clockIn) / 3600000).toFixed(4));
    const postShiftHrs = parseFloat(Math.max(0, (clockOut - shiftEnd) / 3600000).toFixed(4));
    const totalOT      = parseFloat((preShiftHrs + postShiftHrs).toFixed(2));

    console.log(`Total OT: ${totalOT} hrs (pre: ${preShiftHrs.toFixed(2)}, post: ${postShiftHrs.toFixed(2)})`);

    // We want:
    //   June 12  → 0.88 hrs  (to complete it; required 9, had 8.12)
    //   July 22  → 4.27 hrs  (totalOT - 0.88, to complete it; required 3.27, had 2.98)
    //   Sum shown in UI → 0.88 + 4.27 = 5.15 ✓

    const june12Deduct = 0.88;
    const july22Deduct = parseFloat((totalOT - june12Deduct).toFixed(2));

    const groups = await col.find({ employeeId: angelUid }).toArray();

    for (const group of groups) {
      const dateStr = group.sourceHoliday?.dateStr;
      let targetDeduct = null;

      if (dateStr === 'June 12, 2026') targetDeduct = june12Deduct;
      if (dateStr === 'July 22, 2026') targetDeduct = july22Deduct;
      if (targetDeduct === null) continue;

      // Remove any existing Aug 17 weekday_ot sessions
      const cleanSessions = (group.renderedSessions ?? []).filter(
        s => !(s.attendanceDateStr === '2026-08-17' && s.type === 'weekday_ot')
      );

      const newSession = {
        attendanceDateStr: '2026-08-17',
        hours: targetDeduct,
        attendanceId,
        type: 'weekday_ot',
        notes: `OT split: ${preShiftHrs.toFixed(2)} pre-shift + ${postShiftHrs.toFixed(2)} post-shift`,
        recordedAt: new Date().toISOString(),
        recordedBy: 'system'
      };

      const updatedSessions = [...cleanSessions, newSession];
      const newRenderedTotal = parseFloat(updatedSessions.reduce((s, r) => s + r.hours, 0).toFixed(2));
      const newRemaining = parseFloat(Math.max(0, group.requiredHours - newRenderedTotal).toFixed(2));
      const newStatus = newRemaining <= 0 ? 'completed' : 'partial';

      await col.updateOne({ _id: group._id }, {
        $set: {
          renderedSessions: updatedSessions,
          renderedTotal: newRenderedTotal,
          remainingHours: newRemaining,
          status: newStatus,
          updatedAt: new Date()
        }
      });

      console.log(`✅ ${dateStr}: applied ${targetDeduct} hrs → renderedTotal: ${newRenderedTotal}, remaining: ${newRemaining}, status: ${newStatus}`);
    }

    console.log(`\nUI will now show: ${june12Deduct} + ${july22Deduct} = ${parseFloat((june12Deduct + july22Deduct).toFixed(2))} hrs for 2026-08-17`);

  } finally {
    await client.close();
  }
}

fixDoubleCount();
