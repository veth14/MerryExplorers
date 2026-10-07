const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB);
  
  // Find Angel Villegas
  const angel = await db.collection('accounts').findOne({ fullName: /Angel Villegas/i });
  console.log('Angel UID:', angel ? angel._id.toString() : 'Not found');
  
  if (angel) {
    const uid = angel._id.toString();
    const count = await db.collection('attendance').countDocuments({ teacherUid: uid, dateStr: { $gte: '2026-09-29' } });
    console.log('Angel attendance count since Sept 29:', count);
    
    const countAll = await db.collection('attendance').countDocuments({ teacherUid: uid });
    console.log('Angel attendance count ALL:', countAll);
    
    // Check what is the actual field?
    const someRecord = await db.collection('attendance').findOne({ teacherUid: uid });
    console.log('Sample record keys:', someRecord ? Object.keys(someRecord) : 'No record');
  }

  client.close();
}

main().catch(console.error);
