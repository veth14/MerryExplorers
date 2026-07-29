import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    // It's recommended to use a Service Role Key for administrative tasks like deleting old files.
    // If not provided, it falls back to the ANON key, which might fail depending on your Storage RLS policies.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const BUCKETS_TO_CLEAN = ["AttendanceLogs", "AccountProfile"];
    
    // Calculate the cutoff date (6 months ago)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const deletedFiles: Record<string, string[]> = {};

    for (const bucket of BUCKETS_TO_CLEAN) {
      deletedFiles[bucket] = [];
      
      // We list the files. For nested folders, Supabase storage api requires us to traverse.
      // Assuming a relatively flat structure (e.g., teacherUid/file.jpg) or using an empty prefix with search.
      // List all folders/files in the root of the bucket
      const { data: rootItems, error: listError } = await supabase.storage.from(bucket).list();
      
      if (listError || !rootItems) {
        console.error(`Error listing root of bucket ${bucket}:`, listError);
        continue;
      }

      for (const item of rootItems) {
        // If it's a folder, we need to list its contents
        if (!item.id) {
          const folderName = item.name;
          const { data: folderItems, error: folderError } = await supabase.storage.from(bucket).list(folderName);
          
          if (folderError || !folderItems) continue;

          const filesToDelete = folderItems
            .filter((f) => f.created_at && new Date(f.created_at) < sixMonthsAgo && f.id)
            .map((f) => `${folderName}/${f.name}`);

          if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage.from(bucket).remove(filesToDelete);
            if (!deleteError) {
              deletedFiles[bucket].push(...filesToDelete);
            } else {
              console.error(`Error deleting files in ${bucket}/${folderName}:`, deleteError);
            }
          }
        } else {
          // It's a file at the root level
          if (item.created_at && new Date(item.created_at) < sixMonthsAgo) {
            const { error: deleteError } = await supabase.storage.from(bucket).remove([item.name]);
            if (!deleteError) {
              deletedFiles[bucket].push(item.name);
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Cleanup complete", 
      deletedCount: Object.values(deletedFiles).reduce((acc, curr) => acc + curr.length, 0),
      deletedFiles 
    });

  } catch (error: any) {
    console.error("Cleanup cron failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
