// ─────────────────────────────────────────────────────────────
// imageCompressor.ts  –  drop this anywhere in your project
// Usage: import { compressImage } from "@/lib/imageCompressor";
// ─────────────────────────────────────────────────────────────

export interface CompressOptions {
  /** Target max file size in bytes. Default: 900 KB (900_000) */
  maxSizeBytes?: number;
  /** Starting quality (0–1). Default: 0.8 */
  initialQuality?: number;
  /** Minimum quality before giving up. Default: 0.1 */
  minQuality?: number;
  /** Max width in pixels (preserves aspect ratio). Default: 1920 */
  maxWidth?: number;
  /** Max height in pixels (preserves aspect ratio). Default: 1920 */
  maxHeight?: number;
  /** Output MIME type. Default: "image/jpeg" */
  outputType?: "image/jpeg" | "image/webp";
}

/**
 * Compresses an image File to under `maxSizeBytes`.
 *
 * - Non-image files (PDF, etc.) are returned unchanged.
 * - Iteratively reduces quality until the file fits or minQuality is reached.
 * - Scales down the canvas if the image exceeds maxWidth / maxHeight.
 *
 * @returns A new File (or the original if no compression was needed / not an image).
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxSizeBytes = 900_000, // 900 KB
    initialQuality = 0.82,
    minQuality = 0.1,
    maxWidth = 1920,
    maxHeight = 1920,
    outputType = "image/jpeg",
  } = options;

  // ── 1. Skip non-images ────────────────────────────────────
  if (!file.type.startsWith("image/")) return file;

  // ── 2. Already small enough? ──────────────────────────────
  if (file.size <= maxSizeBytes) return file;

  // ── 3. Load into an <img> element ────────────────────────
  const imageBitmap = await createImageBitmap(file);

  // ── 4. Scale down if oversized ────────────────────────────
  let { width, height } = imageBitmap;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  // ── 5. Iteratively reduce quality ─────────────────────────
  let quality = initialQuality;
  let blob: Blob | null = null;

  while (quality >= minQuality) {
    blob = await canvasToBlob(canvas, outputType, quality);
    if (blob.size <= maxSizeBytes) break;
    quality = parseFloat((quality - 0.08).toFixed(2));
  }

  // Fallback: use whatever we have even if still over limit
  if (!blob) blob = await canvasToBlob(canvas, outputType, minQuality);

  // ── 6. Return as a File with original name ────────────────
  const ext = outputType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${ext}`, { type: outputType });
}

// ── Helper: canvas → Blob (promisified) ──────────────────────
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality,
    );
  });
}

/**
 * Compresses multiple files at once.
 * Non-image files pass through unchanged.
 */
export async function compressImages(
  files: File[],
  options?: CompressOptions,
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, options)));
}

/**
 * Tiny helper: returns a human-readable file size string.
 * e.g.  formatBytes(1_234_567)  →  "1.18 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}
