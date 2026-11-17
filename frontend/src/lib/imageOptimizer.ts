/**
 * FaceGate AI - Client-Side Image Optimizer
 * Compress and resize avatar and biometric photos before transmission to Backend & Cloud Storage.
 * Prevents high network latency, payload truncation (StringDataRightTruncation), and high memory usage.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeBytes?: number; // e.g. 150 * 1024 (150 KB)
  mimeType?: "image/jpeg" | "image/webp";
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.82,
  maxSizeBytes: 150 * 1024, // 150 KB
  mimeType: "image/jpeg",
};

/**
 * Compresses an image File or Blob using HTML5 Canvas.
 * Returns a lightweight Base64 Data URL string (< 150KB).
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const mergedOpts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh!"));

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        return reject(new Error("Tệp hình ảnh rỗng!"));
      }

      compressImageBase64(dataUrl, mergedOpts)
        .then(resolve)
        .catch(reject);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Resizes and compresses a Base64 image string.
 * Optimizes facial portrait dimensions for ArcFace / OpenCV while staying under maxSizeBytes.
 */
export async function compressImageBase64(
  base64Str: string,
  options: CompressionOptions = {}
): Promise<string> {
  const { maxWidth = 800, maxHeight = 800, quality = 0.82, maxSizeBytes = 150 * 1024, mimeType = "image/jpeg" } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return new Promise((resolve, reject) => {
    // If running server-side (Next.js SSR), return as-is
    if (typeof window === "undefined") {
      return resolve(base64Str);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onerror = () => reject(new Error("Không thể giải mã dữ liệu hình ảnh!"));

    img.onload = () => {
      let { width, height } = img;

      // Calculate scaled dimensions while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Trình duyệt không hỗ trợ Canvas context 2D!"));
      }

      // High-quality image downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill white background in case of transparent PNG converted to JPEG
      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      let currentQuality = quality;
      let outputDataUrl = canvas.toDataURL(mimeType, currentQuality);

      // Binary size approximation (Base64 length * 0.75)
      let approxSize = Math.round((outputDataUrl.length - outputDataUrl.indexOf(",") - 1) * 0.75);

      // Iteratively reduce quality if still exceeding maxSizeBytes
      while (approxSize > maxSizeBytes && currentQuality > 0.4) {
        currentQuality -= 0.12;
        outputDataUrl = canvas.toDataURL(mimeType, currentQuality);
        approxSize = Math.round((outputDataUrl.length - outputDataUrl.indexOf(",") - 1) * 0.75);
      }

      resolve(outputDataUrl);
    };

    img.src = base64Str;
  });
}
