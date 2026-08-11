import { connectToDatabase } from "../src/lib/mongodb";

async function run() {
  const { db } = await connectToDatabase();
  
  // Find the latest New inquiry
  const latestInquiry = await db.collection("inquiries").findOne(
    { status: "New" },
    { sort: { createdAt: -1 } }
  );

  if (latestInquiry) {
    console.log("Found latest inquiry:", latestInquiry);
    
    // Check if notification already exists
    const existing = await db.collection("notifications").findOne({
      title: "New Inquiry Received",
      "message": { $regex: latestInquiry.parentName }
    });

    if (existing) {
      console.log("Notification already exists for this inquiry.");
    } else {
      await db.collection("notifications").insertOne({
        title: "New Inquiry Received",
        message: `An inquiry from ${latestInquiry.parentName} for ${latestInquiry.childName || "their child"} has been received.`,
        type: "info",
        read: false,
        time: new Date(latestInquiry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }),
        createdAt: latestInquiry.createdAt,
      });
      console.log("Notification inserted.");
    }
  } else {
    console.log("No New inquiries found.");
  }
  
  process.exit(0);
}

run().catch(console.error);
