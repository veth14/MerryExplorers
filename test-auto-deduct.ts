import { connectToDatabase } from './src/lib/mongodb';
import { ObjectId } from 'mongodb';

async function run() {
  const { db } = await connectToDatabase();

  const attendanceId = "6a75eeba4028798c8f174701"; // the dummy record created by the test

  // 1. Find all offset groups that have a renderedSession tied to this attendanceId
  const affectedOffsets = await db.collection("offsets")
    .find({ "renderedSessions.attendanceId": attendanceId })
    .toArray();

  console.log(`Found ${affectedOffsets.length} offset group(s) to roll back.`);

  for (const group of affectedOffsets) {
    const session = (group.renderedSessions || []).find((s: any) => s.attendanceId === attendanceId);
    if (!session) continue;

    const revertedRenderedTotal = parseFloat((group.renderedTotal - session.hours).toFixed(2));
    const revertedRemaining = parseFloat((group.remainingHours + session.hours).toFixed(2));
    const revertedStatus = revertedRemaining >= group.requiredHours ? "pending" : "partial";

    await db.collection("offsets").updateOne(
      { _id: group._id },
      {
        $set: {
          renderedTotal: Math.max(0, revertedRenderedTotal),
          remainingHours: revertedRemaining,
          status: revertedStatus,
          updatedAt: new Date()
        },
        $pull: { renderedSessions: { attendanceId: attendanceId } }
      } as any
    );

    console.log(`Rolled back offset group ${group._id}: -${session.hours}h from renderedTotal, +${session.hours}h to remainingHours, status -> ${revertedStatus}`);
  }

  // 2. Delete the dummy attendance record
  const deleteResult = await db.collection("attendance").deleteOne({ _id: new ObjectId(attendanceId) });
  console.log(`Deleted attendance record: ${deleteResult.deletedCount === 1 ? "success" : "not found (already deleted?)"}`);

  console.log("Rollback complete.");
  process.exit(0);
}
run();