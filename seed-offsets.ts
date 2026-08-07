import { connectToDatabase } from './src/lib/mongodb';

function parseHoursStr(h: number, m: number) {
  return parseFloat((h + m / 60).toFixed(2));
}

async function run() {
  const { db } = await connectToDatabase();
  
  const kyle = await db.collection('accounts').findOne({ fullName: /Kyle Ebuenga/i });
  const angel = await db.collection('accounts').findOne({ fullName: /Angel Villegas/i });
  
  if (!kyle || !angel) {
    console.error("Could not find accounts:", { kyle: !!kyle, angel: !!angel });
    process.exit(1);
  }

  // Clear existing offsets for these two
  await db.collection('offsets').deleteMany({ employeeId: { $in: [kyle._id.toString(), angel._id.toString()] } });

  console.log("Found accounts:", kyle.fullName, angel.fullName);

  const now = new Date();

  // Helper to create offset groups
  const createGroup = async (
    empId: string, 
    dateStr: string, 
    timeIn: string | null, 
    timeOut: string | null, 
    requiredHours: number, 
    rendered: { date: string, timeIn: string | null, timeOut: string | null, hours: number }[]
  ) => {
    
    let remaining = requiredHours;
    let totalRendered = 0;
    const sessions = rendered.map(r => {
      totalRendered += r.hours;
      remaining -= r.hours;
      return {
        attendanceDateStr: r.date,
        timeIn: r.timeIn,
        timeOut: r.timeOut,
        hours: r.hours,
        attendanceId: null,
        type: "saturday",
        notes: "Manual migration",
        recordedAt: now,
        recordedBy: "admin"
      };
    });

    if (remaining < 0) remaining = 0;

    const group = {
      employeeId: empId,
      sourceHoliday: { dateStr, name: "Late/Undertime" },
      timeIn,
      timeOut,
      requiredHours,
      renderedSessions: sessions,
      renderedTotal: totalRendered,
      remainingHours: parseFloat(remaining.toFixed(2)),
      status: remaining === 0 ? "completed" : (totalRendered > 0 ? "partial" : "pending"),
      createdAt: now,
      updatedAt: now,
      createdBy: "admin"
    };

    await db.collection('offsets').insertOne(group);
  };

  // Ann Kyle Ebuenga (From Screenshot)
  // July 2, 2026 | 4:00 PM | 5:30 PM | 1 hours 30 minutes
  await createGroup(kyle._id.toString(), "July 2, 2026", "4:00 PM", "5:30 PM", parseHoursStr(1, 30), [
    // She rendered 3 hours 15 mins on July 18, 2026 | 8:18 AM - 11:33 AM.
    // 1hr 30m goes to July 2. 
    { date: "July 18, 2026", timeIn: "8:18 AM", timeOut: "11:33 AM", hours: parseHoursStr(1, 30) } 
  ]);
  
  // July 15, 2026 | 3:31 PM | 5:30 PM | 1 hours 59 minutes
  await createGroup(kyle._id.toString(), "July 15, 2026", "3:31 PM", "5:30 PM", parseHoursStr(1, 59), [
    // Remaining 1hr 45m from July 18 goes to July 15.
    { date: "July 18, 2026", timeIn: "8:18 AM", timeOut: "11:33 AM", hours: parseHoursStr(1, 45) } 
  ]);
  
  // July 20, 2026 | 1:18 PM | 5:30 PM | 4 hours 12 minutes
  await createGroup(kyle._id.toString(), "July 20, 2026", "1:18 PM", "5:30 PM", parseHoursStr(4, 12), []);
  
  // July 22, 2026 | 3:25 PM | 5:30 PM | 2 hours 5 minutes
  await createGroup(kyle._id.toString(), "July 22, 2026", "3:25 PM", "5:30 PM", parseHoursStr(2, 5), []);


  // Angel Villegas (From Text)
  await createGroup(angel._id.toString(), "June 12, 2026", "8:30 AM", "5:30 PM", parseHoursStr(9, 0), [
    { date: "June 3, 2026", timeIn: "5:30 PM", timeOut: "7:00 PM", hours: parseHoursStr(1, 30) },
    { date: "June 6, 2026", timeIn: "8:30 AM", timeOut: "10:30 AM", hours: parseHoursStr(2, 0) },
    { date: "June 13, 2026", timeIn: "8:30 AM", timeOut: "11:00 AM", hours: parseHoursStr(2, 30) },
    { date: "June 15, 2026", timeIn: "5:30 PM", timeOut: "7:37 PM", hours: parseHoursStr(2, 7) }
  ]); 
  await createGroup(angel._id.toString(), "July 15, 2026", "3:31 PM", "5:30 PM", parseHoursStr(1, 59), []);
  await createGroup(angel._id.toString(), "July 20, 2026", "2:45 PM", "5:30 PM", parseHoursStr(2, 45), []);
  await createGroup(angel._id.toString(), "July 22, 2026", "2:14 PM", "5:30 PM", parseHoursStr(3, 16), []);

  console.log("Migration complete.");
  process.exit(0);
}
run();
