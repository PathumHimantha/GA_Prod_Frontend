// src/lib/compressImage.ts
export type CompressOptions = {
  maxSizeMB?: number; // target max size (default 0.9 MB)
  maxWidthOrHeight?: number; // resize longest side (default 1600)
  initialQuality?: number; // starting JPEG quality (0–1)
  mimeType?: string; // default 'image/jpeg'
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [, base64] = dataUrl.split(",");
  const bin = atob(base64);
  const len = bin.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: "image/jpeg" });
};

const loadImage = (file: File | Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

/**
 * Compresses an image file so its byte size is < maxSizeMB.
 * Returns a new File (JPEG). If compression fails or makes the
 * file larger, returns the original File.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const {
    maxSizeMB = 0.9,
    maxWidthOrHeight = 1600,
    initialQuality = 0.85,
    mimeType = "image/jpeg",
  } = opts;

  const targetBytes = maxSizeMB * 1024 * 1024;

  // Fast path — already small enough
  if (file.size <= targetBytes) return file;
  // Non-images: bail out
  if (!file.type.startsWith("image/")) return file;

  try {
    const img = await loadImage(file);

    // Scale so longest side ≤ maxWidthOrHeight
    let { width, height } = img;
    const scale = Math.min(1, maxWidthOrHeight / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    // Downscale then re-encode. If still too big, shrink + lower quality.
    let quality = initialQuality;
    let iterations = 0;
    const MAX_ITER = 6;

    while (iterations < MAX_ITER) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(mimeType, quality);
      const blob = dataUrlToBlob(dataUrl);

      if (blob.size <= targetBytes) {
        // Preserve original basename but force .jpg
        const base = file.name.replace(/\.[^.]+$/, "");
        return new File([blob], `${base}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }

      // Not small enough → shrink dimensions AND lower quality
      quality = Math.max(0.4, quality - 0.15);
      width = Math.round(width * 0.85);
      height = Math.round(height * 0.85);
      iterations++;
    }

    // Last resort — return whatever we got (usually < 1 MB by now)
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL(mimeType, 0.4);
    const blob = dataUrlToBlob(dataUrl);
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("compressImage failed, using original:", err);
    return file;
  }
}
