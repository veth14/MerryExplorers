const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const { MongoClient } = require('mongodb');

async function seed() {
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  const db = client.db(env.MONGODB_DB);

  // 1. Gather registrations and accounts
  const regs = await db.collection('student_registrations').find({}).toArray();
  const accounts = await db.collection('accounts').find({ role: 'parent' }).toArray();

  const familyList = [];

  for (const r of regs) {
    const parentEmail = (r.parentInfo?.email || '').trim().toLowerCase();
    const parentName = (r.parentInfo?.name || '').trim();
    const phone = (r.parentInfo?.phone || '').trim();
    const first = (r.childInfo?.firstName || '').trim();
    const last = (r.childInfo?.lastName || '').trim();
    const childName = (first + ' ' + last).trim();

    if (!parentEmail || !childName) continue;

    // Check if already in familyList
    const existing = familyList.find(
      (f) => f.parentEmail === parentEmail && f.childName.toLowerCase() === childName.toLowerCase()
    );

    let progName = 'Curious Explorer';
    if (r.program === 'brave-explorer') progName = 'Trailblazer (Brave Explorer)';
    else if (r.program === 'creative-explorer') progName = 'Creative Explorer';
    else if (r.program === 'everyday-curious') progName = 'Everyday Curious';

    const adventureEntry = {
      adventure: 'Adventure 1',
      program: progName,
      classTime: r.classTime || '',
      registrationId: r._id.toString(),
      status: r.status,
      registeredAt: r.submittedAt || new Date('2026-09-30'),
    };

    if (existing) {
      if (!existing.adventures.some((a) => a.adventure === 'Adventure 1' && a.program === progName)) {
        existing.adventures.push(adventureEntry);
      }
    } else {
      familyList.push({
        parentName,
        parentEmail,
        phone,
        childName,
        previousProgram: progName,
        renewingTo: 'Adventure 2',
        adventures: [adventureEntry],
        renewalStatus: 'not_yet_submitted',
        renewalPeriod: 'adventure-1-renewal',
        notes: 'Registered in Adventure 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Also include accounts
  for (const a of accounts) {
    const email = (a.email || '').trim().toLowerCase();
    const childName = (a.childName || '').trim();
    if (!email || !childName) continue;

    const existing = familyList.find(
      (f) => f.parentEmail === email && f.childName.toLowerCase() === childName.toLowerCase()
    );

    let prog = 'Curious Explorer';
    if ((a.program || '').includes('Brave')) prog = 'Trailblazer (Brave Explorer)';
    else if ((a.program || '').includes('Creative')) prog = 'Creative Explorer';
    else if ((a.program || '').includes('Everyday')) prog = 'Everyday Curious';

    const advEntry = {
      adventure: 'Adventure 1',
      program: prog,
      status: 'active',
      enrolledAt: new Date('2026-09-30'),
    };

    if (existing) {
      if (!existing.adventures.some((ad) => ad.adventure === 'Adventure 1')) {
        existing.adventures.push(advEntry);
      }
    } else {
      familyList.push({
        parentName: a.fullName || '',
        parentEmail: email,
        phone: a.phone || '',
        childName: childName,
        previousProgram: prog,
        renewingTo: 'Adventure 2',
        adventures: [advEntry],
        renewalStatus: 'not_yet_submitted',
        renewalPeriod: 'adventure-1-renewal',
        notes: 'Active Adventure 1 family',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log('Inserting', familyList.length, 'families into renewal_families...');
  if (familyList.length > 0) {
    await db.collection('renewal_families').deleteMany({}); // clear any empty/test
    const res = await db.collection('renewal_families').insertMany(familyList);
    console.log('Successfully inserted:', res.insertedCount);
  }

  await client.close();
}

seed().catch(console.error);
