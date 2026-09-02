import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  Phone,
  MapPin,
  Hash,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

import { API_BASE_URL } from "@/apiConfig";

interface Profile {
  full_name?: string;
  username?: string;
  nic?: string;
  address?: string;
  contact_company?: string;
  contact_personal?: string;
  profile_image?: string;
  birth_certificate?: string;
  id_front?: string;
  id_back?: string;
  cv_document?: string;
  driving_license?: string;
  vehicle_book?: string;
}

interface Props {
  userId: number;
  userName: string;
  userBranch: string;
  userRole: string;
  profile: Profile | null;
  isAdmin: boolean;
  onSaved: () => void;
}

const isImageFile = (path?: string) =>
  !!path && /\.(jpg|jpeg|png|gif|webp)$/i.test(path);

const isPdfFile = (path?: string) => !!path && /\.pdf$/i.test(path);

// ── Field: shows lock icon if already filled for non-admin ───────────────────
const ProfileField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  locked,
  textarea,
  icon: Icon,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  locked?: boolean;
  textarea?: boolean;
  icon?: any;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      {locked && (
        <Badge
          variant="secondary"
          className="ml-auto text-[10px] px-1.5 py-0 bg-slate-100 text-slate-400 font-normal"
        >
          Locked
        </Badge>
      )}
    </Label>
    {textarea ? (
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        placeholder={placeholder}
        rows={3}
        className={`w-full px-3 py-2.5 text-sm rounded-xl border transition-all resize-none
          ${
            locked
              ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-white border-slate-200 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
          }`}
      />
    ) : (
      <Input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        placeholder={placeholder}
        className={`h-11 rounded-xl transition-all
          ${
            locked
              ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-white border-slate-200 hover:border-primary/40 focus:ring-2 focus:ring-primary/10"
          }`}
      />
    )}
  </div>
);

// ── Document upload box ───────────────────────────────────────────────────────
const DocUpload = ({
  label,
  fieldName,
  currentPath,
  isAdmin,
  onFile,
}: {
  label: string;
  fieldName: string;
  currentPath?: string;
  isAdmin: boolean;
  onFile: (f: File | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const hasFile = !!currentPath;
  const canUpload = isAdmin || !hasFile;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFile(file);
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </Label>

      {/* Existing file preview */}
      {currentPath && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {isImageFile(currentPath) ? (
            <div className="relative group h-32">
              <img
                src={`${API_BASE_URL}/${currentPath}`}
                alt={label}
                className="w-full h-full object-cover"
              />
              <a
                href={`${API_BASE_URL}/${currentPath}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Eye className="w-6 h-6 text-white" />
              </a>
            </div>
          ) : (
            <a
              href={`${API_BASE_URL}/${currentPath}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 hover:bg-slate-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {isPdfFile(currentPath) ? (
                  <FileText className="w-5 h-5 text-primary" />
                ) : (
                  <FileText className="w-5 h-5 text-primary" />
                )}
              </div>
              <span className="text-xs text-slate-600 truncate flex-1">
                {currentPath.split("/").pop()}
              </span>
              <Eye className="w-4 h-4 text-slate-400 shrink-0" />
            </a>
          )}
        </div>
      )}

      {/* New preview */}
      {preview && (
        <div className="h-28 rounded-xl overflow-hidden border border-primary/30">
          <img
            src={preview}
            alt="preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 text-sm text-slate-500 hover:text-primary transition-all"
        >
          <Upload className="w-4 h-4" />
          {hasFile ? "Change file" : "Upload file"}
        </button>
      )}
      {!canUpload && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs text-slate-500">Document uploaded</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleChange}
      />
    </div>
  );
};

// ── Main Tab ──────────────────────────────────────────────────────────────────
const GeneralTab = ({
  userId,
  userName,
  userBranch,
  userRole,
  profile,
  isAdmin,
  onSaved,
}: Props) => {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    nic: profile?.nic || "",
    address: profile?.address || "",
    contact_company: profile?.contact_company || "",
    contact_personal: profile?.contact_personal || "",
  });

  const [files, setFiles] = useState<Record<string, File | null>>({
    profile_image: null,
    birth_certificate: null,
    id_front: null,
    id_back: null,
    cv_document: null,
    driving_license: null,
    vehicle_book: null,
  });
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const profileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const setField = (key: string) => (val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const isLocked = (field: keyof Profile) => !isAdmin && !!profile?.[field];

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("requester_role", userRole);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, f]) => {
        if (f) fd.append(k, f);
      });

      const res = await fetch(`${API_BASE_URL}/api/profile/general/${userId}`, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess("Profile updated successfully!");
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const docFields = [
    { label: "Birth Certificate", key: "birth_certificate" },
    { label: "ID Card (Front)", key: "id_front" },
    { label: "ID Card (Back)", key: "id_back" },
    { label: "CV / Resume", key: "cv_document" },
    { label: "Driving License", key: "driving_license" },
    { label: "Vehicle Book", key: "vehicle_book" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Status messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Profile image + read-only system fields */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="relative group w-24 h-24">
                {profilePreview || profile?.profile_image ? (
                  <img
                    src={
                      profilePreview ||
                      `${API_BASE_URL}/${profile?.profile_image}`
                    }
                    alt={userName}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-3xl font-bold text-primary shadow-lg">
                    {userName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                {(isAdmin || !profile?.profile_image) && (
                  <button
                    type="button"
                    onClick={() => profileRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                )}
                <input
                  ref={profileRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFiles((p) => ({ ...p, profile_image: f }));
                    if (f) {
                      const r = new FileReader();
                      r.onload = () => setProfilePreview(r.result as string);
                      r.readAsDataURL(f);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-center text-slate-400 mt-2">
                {isAdmin || !profile?.profile_image
                  ? "Click to change"
                  : "Locked"}
              </p>
            </div>

            {/* System info (read-only) */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                  Name
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {userName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                  Branch
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {userBranch}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                  Role
                </p>
                <Badge className="bg-primary/10 text-primary border-0 capitalize">
                  {userRole}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info fields */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ProfileField
              label="Full Name"
              name="full_name"
              value={form.full_name}
              onChange={setField("full_name")}
              locked={isLocked("full_name")}
              icon={User}
              placeholder="Enter full name"
            />
            <ProfileField
              label="Username"
              name="username"
              value={form.username}
              onChange={setField("username")}
              locked={isLocked("username")}
              icon={Hash}
              placeholder="Enter username"
            />
            <ProfileField
              label="NIC Number"
              name="nic"
              value={form.nic}
              onChange={setField("nic")}
              locked={isLocked("nic")}
              icon={Hash}
              placeholder="000000000V"
            />
            <ProfileField
              label="Company Contact"
              name="contact_company"
              value={form.contact_company}
              onChange={setField("contact_company")}
              locked={isLocked("contact_company")}
              icon={Phone}
              placeholder="+94 XX XXX XXXX"
            />
            <ProfileField
              label="Personal Contact"
              name="contact_personal"
              value={form.contact_personal}
              onChange={setField("contact_personal")}
              locked={isLocked("contact_personal")}
              icon={Phone}
              placeholder="+94 XX XXX XXXX"
            />
            <ProfileField
              label="Address"
              name="address"
              value={form.address}
              onChange={setField("address")}
              locked={isLocked("address")}
              icon={MapPin}
              placeholder="Enter address"
              textarea
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="gap-2 px-8 h-11 rounded-xl bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default GeneralTab;
