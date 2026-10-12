const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const { MongoClient } = require('mongodb');

async function cleanNotes() {
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  const db = client.db(env.MONGODB_DB);

  const families = await db.collection('renewal_families').find({}).toArray();
  let count = 0;
  for (const f of families) {
    if (f.notes && /enroll/i.test(f.notes)) {
      const newNotes = f.notes.replace(/enrolled/gi, 'Registered').replace(/enrollment/gi, 'Registration').replace(/enroll/gi, 'Register');
      await db.collection('renewal_families').updateOne(
        { _id: f._id },
        { $set: { notes: newNotes } }
      );
      count++;
    }
  }
  console.log('Cleaned notes for', count, 'families');
  await client.close();
}

cleanNotes().catch(console.error);
