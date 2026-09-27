import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client Configuration
 * URL: https://lsdyyeswavrzotutrfbv.supabase.co
 * Key: sb_publishable_t_NcpW-hVw6TXX0JvehvnA_gb9IhIET
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lsdyyeswavrzotutrfbv.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_t_NcpW-hVw6TXX0JvehvnA_gb9IhIET";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Compress and optimize a base64 image down to high-performance size (~60KB - 150KB)
 * Prevents payload exhaustion and optimizes cloud storage bandwidth.
 */
export async function compressImageBase64(
  dataUrl: string,
  maxWidth = 720,
  quality = 0.85
): Promise<string> {
  if (typeof window === "undefined" || !dataUrl.startsWith("data:image")) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvas.toDataURL("image/jpeg", quality);
      resolve(optimized);
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Converts a base64 data URL to a binary Blob for cloud upload.
 */
export function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(";base64,");
  const contentType = parts[0]?.split(":")[1] || "image/jpeg";
  const raw = window.atob(parts[1] || "");
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

export interface UploadResult {
  url: string;
  source: "supabase" | "optimized";
  bucket?: string;
  path?: string;
  sizeBytes?: number;
}

/**
 * Uploads avatar / face photo to Supabase Storage bucket ('avatars' or 'faces').
 * Automatically optimizes large multi-megabyte captures before upload.
 * If the remote bucket does not exist or has RLS policy restrictions, gracefully returns optimized data.
 */
export async function uploadAvatarToSupabase(
  photoData: string | Blob | File,
  employeeId: string,
  bucketName = "avatars"
): Promise<UploadResult> {
  const cleanEmpId = (employeeId || "emp").replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();
  const filePath = `faces/${cleanEmpId}_${timestamp}.jpg`;

  try {
    let blob: Blob;
    let base64String = "";

    if (typeof photoData === "string") {
      // Compress if base64 string
      base64String = await compressImageBase64(photoData, 720, 0.82);
      blob = base64ToBlob(base64String);
    } else {
      blob = photoData;
    }

    // Try Supabase Storage upload
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn(`Supabase Storage upload to bucket '${bucketName}' notice:`, error.message);
      // If bucket 'avatars' is not created yet, return the optimized lightweight image
      return {
        url: base64String || (typeof photoData === "string" ? photoData : ""),
        source: "optimized",
        sizeBytes: blob.size,
      };
    }

    if (data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        url: publicUrlData.publicUrl,
        source: "supabase",
        bucket: bucketName,
        path: data.path,
        sizeBytes: blob.size,
      };
    }
  } catch (err) {
    console.warn("Supabase Storage upload fallback:", err);
  }

  // Graceful fallback: return optimized data
  const fallbackStr = typeof photoData === "string" ? await compressImageBase64(photoData, 640, 0.8) : "";
  return {
    url: fallbackStr,
    source: "optimized",
  };
}

/**
 * Sync Face Biometric Vector & Profile to Supabase (if table exists)
 */
export async function syncFaceProfileToSupabase(payload: {
  employee_id: string;
  encoding_vector: number[];
  quality_score?: number;
  samples_count?: number;
  master_photo_url?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("face_profiles").upsert({
      employee_id: payload.employee_id,
      encoding: payload.encoding_vector,
      quality_score: payload.quality_score || 0.98,
      samples_count: payload.samples_count || 30,
      master_photo_url: payload.master_photo_url,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      // Table might not exist yet in Supabase schema cache
      console.debug("Supabase table face_profiles sync notice:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.debug("Supabase sync exception:", err);
    return false;
  }
}
