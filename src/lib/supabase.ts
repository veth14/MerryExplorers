import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadAvatar(file: File, accountId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${accountId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from("AccountProfile")
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error("Error uploading avatar to Supabase:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("AccountProfile")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Uploads a webcam snapshot (Blob) to the AttendanceLogs Supabase bucket.
 * @param blob - The image blob captured from the canvas
 * @param teacherUid - The teacher's Firebase UID (used to organise files)
 * @param type - "clock-in" | "clock-out" | "break-start" | "break-end"
 * @returns The public URL of the uploaded photo
 */
export async function uploadAttendanceLog(
  blob: Blob,
  teacherUid: string,
  type: "clock-in" | "clock-out" | "break-start" | "break-end"
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `${teacherUid}/${type}-${timestamp}.jpg`;

  const { error } = await supabase.storage
    .from("AttendanceLogs")
    .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });

  if (error) {
    console.error("Error uploading attendance photo:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("AttendanceLogs")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
