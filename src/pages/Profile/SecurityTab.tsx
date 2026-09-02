import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Users2,
  UserCircle,
} from "lucide-react";

import { API_BASE_URL } from "@/apiConfig";

interface Profile {
  emergency_name_1?: string;
  emergency_contact_1?: string;
  emergency_relation_1?: string;
  emergency_name_2?: string;
  emergency_contact_2?: string;
  emergency_relation_2?: string;
  emergency_name_3?: string;
  emergency_contact_3?: string;
  emergency_relation_3?: string;
}

interface Props {
  userId: number;
  userRole: string;
  profile: Profile | null;
  isAdmin: boolean;
  onSaved: () => void;
}

// ── Password strength meter ───────────────────────────────────────────────────
const strength = (pwd: string) => {
  if (!pwd) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const map = [
    { label: "Too short", color: "bg-red-400" },
    { label: "Weak", color: "bg-red-400" },
    { label: "Fair", color: "bg-amber-400" },
    { label: "Good", color: "bg-blue-400" },
    { label: "Strong", color: "bg-green-500" },
  ];
  return { score: s, ...map[s] };
};

const PasswordInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "••••••••"}
          className="h-11 rounded-xl pr-10 border-slate-200 hover:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ── Emergency contact group ───────────────────────────────────────────────────
const EmergencyGroup = ({
  index,
  name,
  contact,
  relation,
  onName,
  onContact,
  onRelation,
  locked,
  isAdmin,
}: {
  index: number;
  name: string;
  contact: string;
  relation: string;
  onName: (v: string) => void;
  onContact: (v: string) => void;
  onRelation: (v: string) => void;
  locked: boolean;
  isAdmin: boolean;
}) => {
  const colors = ["from-blue-50", "from-purple-50", "from-amber-50"];
  const isLocked = locked && !isAdmin;

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${colors[index - 1]} to-white p-5`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {index}
        </div>
        <h4 className="text-sm font-semibold text-slate-700">
          Emergency Contact {index}
        </h4>
        {isLocked && (
          <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Locked
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Name",
            icon: UserCircle,
            value: name,
            onChange: onName,
            placeholder: "Contact name",
          },
          {
            label: "Phone Number",
            icon: Phone,
            value: contact,
            onChange: onContact,
            placeholder: "+94 XX XXX XXXX",
          },
          {
            label: "Relationship",
            icon: Users2,
            value: relation,
            onChange: onRelation,
            placeholder: "e.g. Spouse",
          },
        ].map(({ label, icon: Icon, value, onChange, placeholder }) => (
          <div key={label} className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide text-slate-500 uppercase flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              readOnly={isLocked}
              placeholder={placeholder}
              className={`h-10 rounded-xl text-sm ${
                isLocked
                  ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                  : "border-slate-200 hover:border-primary/40 focus:ring-2 focus:ring-primary/10"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Tab ──────────────────────────────────────────────────────────────────
const SecurityTab = ({
  userId,
  userRole,
  profile,
  isAdmin,
  onSaved,
}: Props) => {
  // Password state
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Emergency contacts state
  const [em, setEm] = useState({
    emergency_name_1: profile?.emergency_name_1 || "",
    emergency_contact_1: profile?.emergency_contact_1 || "",
    emergency_relation_1: profile?.emergency_relation_1 || "",
    emergency_name_2: profile?.emergency_name_2 || "",
    emergency_contact_2: profile?.emergency_contact_2 || "",
    emergency_relation_2: profile?.emergency_relation_2 || "",
    emergency_name_3: profile?.emergency_name_3 || "",
    emergency_contact_3: profile?.emergency_contact_3 || "",
    emergency_relation_3: profile?.emergency_relation_3 || "",
  });
  const [emSaving, setEmSaving] = useState(false);
  const [emSuccess, setEmSuccess] = useState("");
  const [emError, setEmError] = useState("");

  const pwdStrength = strength(pwd.newPwd);

  const handlePasswordSave = async () => {
    if (!pwd.newPwd) {
      setPwdError("New password is required");
      return;
    }
    if (pwd.newPwd !== pwd.confirm) {
      setPwdError("Passwords do not match");
      return;
    }
    if (pwd.newPwd.length < 8) {
      setPwdError("Password must be at least 8 characters");
      return;
    }
    if (!isAdmin && !pwd.current) {
      setPwdError("Current password is required");
      return;
    }

    setPwdSaving(true);
    setPwdError("");
    setPwdSuccess("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/profile/password/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_password: pwd.current,
            new_password: pwd.newPwd,
            requester_role: userRole,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPwdSuccess("Password changed successfully!");
      setPwd({ current: "", newPwd: "", confirm: "" });
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setPwdSaving(false);
    }
  };

  const handleEmergencySave = async () => {
    setEmSaving(true);
    setEmError("");
    setEmSuccess("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/profile/emergency/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...em, requester_role: userRole }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setEmSuccess("Emergency contacts saved!");
      onSaved();
    } catch (err: any) {
      setEmError(err.message);
    } finally {
      setEmSaving(false);
    }
  };

  const emField = (key: keyof typeof em) => (val: string) =>
    setEm((p) => ({ ...p, [key]: val }));

  const emLocked = (key: keyof typeof em) => !isAdmin && !!profile?.[key];
  const groupLocked = (i: number) =>
    emLocked(`emergency_name_${i}` as keyof typeof em);

  return (
    <div className="space-y-6">
      {/* ── Password section ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Change Password
          </h3>

          {pwdSuccess && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              {pwdSuccess}
            </div>
          )}
          {pwdError && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {pwdError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {!isAdmin && (
              <div className="sm:col-span-2">
                <PasswordInput
                  label="Current Password"
                  value={pwd.current}
                  onChange={(v) => setPwd((p) => ({ ...p, current: v }))}
                />
              </div>
            )}
            <PasswordInput
              label="New Password"
              value={pwd.newPwd}
              onChange={(v) => setPwd((p) => ({ ...p, newPwd: v }))}
              placeholder="Min 8 characters"
            />
            <PasswordInput
              label="Confirm Password"
              value={pwd.confirm}
              onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))}
              placeholder="Re-enter new password"
            />
          </div>

          {/* Strength bar */}
          {pwd.newPwd && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">
                  Password strength
                </span>
                <span
                  className={`text-xs font-medium ${pwdStrength.score <= 1 ? "text-red-500" : pwdStrength.score <= 2 ? "text-amber-500" : pwdStrength.score <= 3 ? "text-blue-500" : "text-green-500"}`}
                >
                  {pwdStrength.label}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 rounded-full transition-all ${i <= pwdStrength.score ? pwdStrength.color : "bg-slate-100"}`}
                  />
                ))}
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  { ok: pwd.newPwd.length >= 8, label: "Min 8 characters" },
                  { ok: /[A-Z]/.test(pwd.newPwd), label: "Uppercase letter" },
                  { ok: /[0-9]/.test(pwd.newPwd), label: "Number" },
                  {
                    ok: /[^A-Za-z0-9]/.test(pwd.newPwd),
                    label: "Special character",
                  },
                ].map(({ ok, label }) => (
                  <li
                    key={label}
                    className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-slate-400"}`}
                  >
                    <CheckCircle2
                      className={`w-3 h-3 ${ok ? "text-green-500" : "text-slate-200"}`}
                    />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end mt-5">
            <Button
              onClick={handlePasswordSave}
              disabled={pwdSaving}
              className="gap-2 px-6 h-10 rounded-xl"
            >
              {pwdSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Emergency contacts ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Emergency Contacts
          </h3>

          {emSuccess && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              {emSuccess}
            </div>
          )}
          {emError && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {emError}
            </div>
          )}

          <div className="space-y-4">
            {([1, 2, 3] as const).map((i) => (
              <EmergencyGroup
                key={i}
                index={i}
                isAdmin={isAdmin}
                locked={groupLocked(i)}
                name={em[`emergency_name_${i}` as keyof typeof em]}
                contact={em[`emergency_contact_${i}` as keyof typeof em]}
                relation={em[`emergency_relation_${i}` as keyof typeof em]}
                onName={emField(`emergency_name_${i}` as keyof typeof em)}
                onContact={emField(`emergency_contact_${i}` as keyof typeof em)}
                onRelation={emField(
                  `emergency_relation_${i}` as keyof typeof em,
                )}
              />
            ))}
          </div>

          <div className="flex justify-end mt-5">
            <Button
              onClick={handleEmergencySave}
              disabled={emSaving}
              className="gap-2 px-6 h-10 rounded-xl"
            >
              {emSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Contacts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityTab;
