import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  FileText,
  ShieldCheck,
  Lock,
} from "lucide-react";

import { API_BASE_URL } from "@/apiConfig";

interface Profile {
  birth_certificate?: string;
  id_front?: string;
  id_back?: string;
  cv_document?: string;
  driving_license?: string;
  vehicle_book?: string;
  police_report?: string; // ✅ Added
}

interface Props {
  userId: number;
  userRole: string;
  profile: Profile | null;
  isAdmin: boolean;
  onSaved: () => void;
}

const isImage = (p?: string) => !!p && /\.(jpg|jpeg|png|gif|webp)$/i.test(p);

const docMeta = [
  {
    key: "birth_certificate",
    label: "Birth Certificate",
    icon: "🪪",
    accept: "image/*,.pdf",
  },
  {
    key: "id_front",
    label: "ID Card — Front",
    icon: "🪪",
    accept: "image/*,.pdf",
  },
  {
    key: "id_back",
    label: "ID Card — Back",
    icon: "🪪",
    accept: "image/*,.pdf",
  },
  {
    key: "cv_document",
    label: "CV / Résumé",
    icon: "📄",
    accept: "image/*,.pdf,.doc,.docx",
  },
  {
    key: "driving_license",
    label: "Driving License",
    icon: "🚗",
    accept: "image/*,.pdf",
  },
  {
    key: "vehicle_book",
    label: "Vehicle Book",
    icon: "🚗",
    accept: "image/*,.pdf",
  },
  {
    key: "police_report", // ✅ Added
    label: "Police Report",
    icon: "👮",
    accept: "image/*,.pdf",
  },
] as const;

// ── Single document card ──────────────────────────────────────────────────────
const DocCard = ({
  docKey,
  label,
  icon,
  accept,
  currentPath,
  isAdmin,
  onFile,
}: {
  docKey: string;
  label: string;
  icon: string;
  accept: string;
  currentPath?: string;
  isAdmin: boolean;
  onFile: (f: File | null) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const hasExisting = !!currentPath;
  const canUpload = isAdmin || !hasExisting;

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setStaged(f);
    onFile(f);
    if (f && f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => setPreview(r.result as string);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const statusBadge = hasExisting ? (
    <Badge className="bg-green-50 text-green-700 border border-green-200 gap-1 text-[11px]">
      <CheckCircle2 className="w-3 h-3" /> Uploaded
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-[11px] text-slate-400">
      Missing
    </Badge>
  );

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
      {/* Preview area */}
      <div className="relative h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {preview || (hasExisting && isImage(currentPath)) ? (
          <>
            <img
              src={preview || `${API_BASE_URL}/${currentPath}`}
              alt={label}
              className="w-full h-full object-cover"
            />
            {!preview && (
              <a
                href={`${API_BASE_URL}/${currentPath}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Eye className="w-6 h-6 text-white" />
              </a>
            )}
          </>
        ) : hasExisting ? (
          <a
            href={`${API_BASE_URL}/${currentPath}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 p-4 hover:opacity-75 transition-opacity"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <span className="text-xs text-slate-500 text-center leading-tight max-w-[160px] truncate">
              {currentPath?.split("/").pop()}
            </span>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <Eye className="w-3.5 h-3.5" /> View
            </div>
          </a>
        ) : staged ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs text-slate-500 max-w-[160px] truncate px-2 text-center">
              {staged.name}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="text-3xl">{icon}</div>
            <span className="text-xs text-slate-400">No file</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-slate-700 leading-tight">
            {label}
          </p>
          {statusBadge}
        </div>

        {canUpload ? (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-xs text-slate-500 hover:text-primary transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            {hasExisting ? "Replace" : "Upload"}
          </button>
        ) : (
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-50 text-xs text-slate-400">
            <Lock className="w-3 h-3" /> Locked — contact admin
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handlePick}
        />
      </div>
    </div>
  );
};

// ── Tab component ─────────────────────────────────────────────────────────────
const UserDocuments = ({
  userId,
  userRole,
  profile,
  isAdmin,
  onSaved,
}: Props) => {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    const hasAny = Object.values(files).some(Boolean);
    if (!hasAny) {
      setError("No new files to upload.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("requester_role", userRole);
      Object.entries(files).forEach(([k, f]) => {
        if (f) fd.append(k, f);
      });

      const res = await fetch(`${API_BASE_URL}/api/profile/general/${userId}`, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSuccess("Documents saved!");
      setFiles({});
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadedCount = docMeta.filter(
    (d) => !!profile?.[d.key as keyof Profile],
  ).length;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-slate-700">
                Document Completeness
              </p>
            </div>
            <Badge
              className={`border-0 ${uploadedCount === docMeta.length ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
            >
              {uploadedCount} / {docMeta.length} uploaded
            </Badge>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${uploadedCount === docMeta.length ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${(uploadedCount / docMeta.length) * 100}%` }}
            />
          </div>
          {!isAdmin && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Uploaded documents are locked.
              Contact your administrator to update them.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docMeta.map((d) => (
          <DocCard
            key={d.key}
            docKey={d.key}
            label={d.label}
            icon={d.icon}
            accept={d.accept}
            currentPath={profile?.[d.key as keyof Profile]}
            isAdmin={isAdmin}
            onFile={(f) => setFiles((p) => ({ ...p, [d.key]: f }))}
          />
        ))}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 px-8 h-11 rounded-xl"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Documents
        </Button>
      </div>
    </div>
  );
};

export default UserDocuments;
