import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

// ── tiny image compressor ─────────────────────────────────────
async function compressImage(
  file: File,
  { maxSizeBytes = 900_000 }: { maxSizeBytes?: number } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= maxSizeBytes) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const scale = Math.sqrt(maxSizeBytes / file.size);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          resolve(
            new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
            }),
          );
        },
        "image/jpeg",
        0.82,
      );
    };
    img.src = url;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── types ─────────────────────────────────────────────────────
interface FileUploadFieldProps {
  id: string;
  label: string;
  required?: boolean;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  maxFiles?: number;
  existingImages?: string[]; // URLs of existing images
  onRemoveExisting?: (index: number) => void;
}

// ── component ─────────────────────────────────────────────────
const FileUploadField = ({
  id,
  label,
  required = false,
  multiple = false,
  onFiles,
  maxFiles = 10,
  existingImages = [],
  onRemoveExisting,
}: FileUploadFieldProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    const newNames: string[] = [];

    const remainingSlots = maxFiles - files.length;
    const filesToProcess = Math.min(rawFiles.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const raw = rawFiles[i];
      const compressed = await compressImage(raw, { maxSizeBytes: 900_000 });

      newFiles.push(compressed);
      newNames.push(
        compressed !== raw
          ? `${compressed.name} (${formatBytes(raw.size)} → ${formatBytes(compressed.size)})`
          : compressed.name,
      );

      if (compressed.type.startsWith("image/")) {
        const reader = new FileReader();
        const preview = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressed);
        });
        newPreviews.push(preview);
      }
    }

    const updatedFiles = [...files, ...newFiles];
    const updatedPreviews = [...previews, ...newPreviews];
    const updatedNames = [...fileNames, ...newNames];

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    setFileNames(updatedNames);

    // Notify parent with all files
    if (onFiles) {
      onFiles(updatedFiles);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    const updatedNames = fileNames.filter((_, i) => i !== index);

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    setFileNames(updatedNames);

    if (onFiles) {
      onFiles(updatedFiles);
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
    setPreviews([]);
    setFileNames([]);
    if (inputRef.current) inputRef.current.value = "";
    if (onFiles) {
      onFiles([]);
    }
  };

  const totalImages = files.length + existingImages.length;

  return (
    <div className="group relative rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        {/* Upload area */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
            {multiple && (
              <span className="text-xs text-muted-foreground ml-2">
                ({totalImages}/{maxFiles} images)
              </span>
            )}
          </p>

          <p className="text-xs text-muted-foreground mt-0.5">
            {multiple
              ? `Upload up to ${maxFiles} images`
              : "JPG, PNG or PDF accepted"}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <label
              htmlFor={id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
            >
              <Upload size={12} />
              {multiple ? "Browse Images" : "Browse"}
            </label>

            {files.length > 0 && (
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-xs text-destructive hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image preview grid */}
      {(existingImages.length > 0 || previews.length > 0) && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {/* Existing images */}
          {existingImages.map((url, index) => (
            <div key={`existing-${index}`} className="relative group/image">
              <div className="w-full aspect-square rounded-lg overflow-hidden border border-border shadow-sm">
                <img
                  src={url}
                  alt={`Existing ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform opacity-0 group-hover/image:opacity-100"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}

          {/* New uploaded images */}
          {previews.map((preview, index) => (
            <div key={`new-${index}`} className="relative group/image">
              <div className="w-full aspect-square rounded-lg overflow-hidden border border-border shadow-sm">
                <img
                  src={preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform opacity-0 group-hover/image:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        id={id}
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FileUploadField;
