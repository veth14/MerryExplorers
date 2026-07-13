import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const accounts = await db.collection("accounts").find({}).toArray();
    
    // Map _id back to id for frontend compatibility
    const formattedAccounts = accounts.map(acc => ({
      ...acc,
      id: acc._id.toString(),
      _id: undefined
    }));
    
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
