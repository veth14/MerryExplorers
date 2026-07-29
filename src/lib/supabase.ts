import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadAvatar(file: File, accountId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${accountId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Compress the image before uploading
  const options = {
    maxSizeMB: 0.2, // Max file size in MB (200KB)
    maxWidthOrHeight: 500, // Max width/height
    useWebWorker: true,
  };
  const compressedFile = await imageCompression(file, options);

  const { error } = await supabase.storage
    .from("AccountProfile")
    .upload(filePath, compressedFile, { upsert: true });

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

  // Compress the webcam snapshot before uploading
  const options = {
    maxSizeMB: 0.2, // 200KB
    maxWidthOrHeight: 800,
    useWebWorker: true,
  };
  
  // imageCompression accepts File or Blob
  const compressedBlob = await imageCompression(blob as File, options);

  const { error } = await supabase.storage
    .from("AttendanceLogs")
    .upload(filePath, compressedBlob, { contentType: "image/jpeg", upsert: false });

  if (error) {
    console.error("Error uploading attendance photo:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("AttendanceLogs")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
