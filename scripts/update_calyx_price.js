const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);

  console.log('--- 1. Updating Calyx in student_registrations ---');
  const regId = new ObjectId('6acf716f8e3780f5e1efee04');
  const reg = await db.collection('student_registrations').findOne({ _id: regId });

  if (reg) {
    const existingNotes = reg.notes || '';
    const noteAddition = ' | Pioneer rate adjusted from ₱4,885 to ₱4,820 (₱65 to be refunded manually)';
    const updatedNotes = existingNotes.includes('Pioneer rate adjusted') ? existingNotes : (existingNotes + noteAddition);

    const regUpdateRes = await db.collection('student_registrations').updateOne(
      { _id: regId },
      {
        $set: {
          amountDue: 4820,
          customRate: 4820,
          amountPaid: 4820,
          originalAmountPaid: 4885,
          refundDue: 65,
          isPioneer: true,
          unmatchedFamily: false,
          notes: updatedNotes,
          updatedAt: new Date()
        }
      }
    );
    console.log('student_registrations update count:', regUpdateRes.modifiedCount);
  }

  // Also update the earlier expired placeholder registration if present
  await db.collection('student_registrations').updateOne(
    { _id: new ObjectId('6acf70616886548ea30ff8d0') },
    {
      $set: {
        customRate: 4820,
        amountDue: 0,
        isPioneer: true,
        updatedAt: new Date()
      }
    }
  );

  console.log('\n--- 2. Updating Calyx in renewal_families ---');
  const famId = new ObjectId('6acc9b2bb9527deb69cc208f');
  const famUpdateRes = await db.collection('renewal_families').updateOne(
    { _id: famId },
    {
      $set: {
        registrationId: '6acf716f8e3780f5e1efee04',
        renewalStatus: 'confirmed',
        amountDue: 4820,
        amountPaid: 4820,
        pioneerRate: 4820,
        isPioneer: true,
        updatedAt: new Date()
      }
    }
  );
  console.log('renewal_families update count:', famUpdateRes.modifiedCount);

  console.log('\n--- 3. Ensuring Calyx in pioneer_families ---');
  const pioneerMatch = await db.collection('pioneer_families').findOne({
    $or: [
      { email: 'mariel.guian@gmail.com' },
      { childName: { $regex: /Calyx/i } }
    ]
  });
  if (!pioneerMatch) {
    await db.collection('pioneer_families').insertOne({
      parentName: 'Mariel Guian Orallo',
      childName: 'Calyx Cloud Orallo',
      email: 'mariel.guian@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('Inserted Calyx into pioneer_families');
  } else {
    console.log('Calyx already in pioneer_families:', pioneerMatch._id);
  }

  console.log('\n--- 4. Verify updated registration ---');
  const updatedReg = await db.collection('student_registrations').findOne({ _id: regId });
  console.log('Updated registration:', {
    childName: `${updatedReg.childInfo?.firstName} ${updatedReg.childInfo?.lastName}`,
    parentEmail: updatedReg.parentInfo?.email,
    program: updatedReg.program,
    amountDue: updatedReg.amountDue,
    amountPaid: updatedReg.amountPaid,
    customRate: updatedReg.customRate,
    isPioneer: updatedReg.isPioneer,
    notes: updatedReg.notes
  });

  await client.close();
}
run().catch(console.error);
