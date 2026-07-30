import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireInternalAuth } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const { db } = await connectToDatabase();
    const accounts = await db.collection("accounts").find({}).toArray();
    
    // Get all currently active leaves to dynamically compute 'on-leave' status
    const today = new Date().toISOString().split("T")[0];
    const activeLeaves = await db.collection("leaves").find({
      status: "Approved",
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).toArray();
    
    const teachersOnLeave = new Set(activeLeaves.map(l => l.teacherId));
    
    // Map _id back to id for frontend compatibility
    const formattedAccounts = accounts.map(acc => {
      const id = acc._id.toString();
      const isOnLeave = teachersOnLeave.has(id);
      let status = acc.status;
      if (isOnLeave) {
        status = "on-leave";
      } else if (status === "on-leave") {
        status = "active";
      }
      
      return {
        ...acc,
        id,
        _id: undefined,
        status
      };
    });
    
    return NextResponse.json(formattedAccounts, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120"
      }
    });
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const deny = requireInternalAuth(request);
  if (deny) return deny;
  try {
    const data = await request.json();
    const { db } = await connectToDatabase();
    
    const { id, ...accountData } = data; // separate id
    
    // Use the Firebase UID as the MongoDB _id if provided
    const documentToInsert = id ? { _id: id, ...accountData } : accountData;
    
    const result = await db.collection("accounts").insertOne(documentToInsert);
    
    return NextResponse.json({ ...accountData, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("Failed to create account:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
