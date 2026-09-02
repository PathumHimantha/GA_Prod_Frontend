import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  FileText,
  Users,
  ArrowLeft,
  Loader2,
  Building2,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Tabs
import GeneralTab from "./GeneralTab";
import SecurityTab from "./SecurityTab";
import UserDocuments from "./UserDocuments";
import ManageUsers from "./ManageUsers";

import { API_BASE_URL } from "@/apiConfig";

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserInfo {
  id: number;
  name: string;
  email: string;
  bname: string;
  role: string;
}
interface ProfileData {
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
interface LeaveYear {
  year: number;
  total_leaves: number;
  days_taken: number;
}

type TabId = "general" | "documents" | "security" | "manage";

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS = (
  isAdmin: boolean,
): { id: TabId; label: string; icon: any; adminOnly?: boolean }[] =>
  [
    { id: "general", label: "General", icon: User },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "security", label: "Security", icon: Shield },
    { id: "manage", label: "Manage Users", icon: Users, adminOnly: true },
  ].filter((t) => !t.adminOnly || isAdmin);

// ── Completeness dot ──────────────────────────────────────────────────────────
const ProfileCompleteness = ({ profile }: { profile: ProfileData | null }) => {
  const fields = [
    "full_name",
    "username",
    "nic",
    "address",
    "contact_company",
    "contact_personal",
    "profile_image",
    "birth_certificate",
    "id_front",
    "id_back",
    "cv_document",
    "driving_license",
    "vehicle_book",
  ] as (keyof ProfileData)[];
  const filled = fields.filter((f) => !!profile?.[f]).length;
  const pct = Math.round((filled / fields.length) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2.5"
          />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke={pct === 100 ? "#22c55e" : "var(--primary, #3b82f6)"}
            strokeWidth="2.5"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
          {pct}%
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500">Profile complete</p>
        <p className="text-[11px] text-slate-400">
          {filled}/{fields.length} fields filled
        </p>
      </div>
    </div>
  );
};

// ── Leave stats strip ─────────────────────────────────────────────────────────
const LeaveStrip = ({ stats }: { stats: LeaveYear[] }) => {
  if (!stats.length) return null;
  const ANNUAL_LIMIT = 21;
  return (
    <div className="flex flex-wrap gap-3">
      {stats.slice(0, 3).map((s) => {
        const left = ANNUAL_LIMIT - s.days_taken;
        return (
          <div
            key={s.year}
            className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">{s.year}</p>
              <p className="text-[11px] text-slate-400">
                <span
                  className={`font-semibold ${left < 5 ? "text-red-500" : "text-green-600"}`}
                >
                  {left}
                </span>{" "}
                days remaining
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyProfile = () => {
  const { user } = useAuth();
  const isAdmin = user?.status === "admin";

  // If admin is viewing another user's profile
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  // Profile data
  const [targetUser, setTargetUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [leaveStats, setLeaveStats] = useState<LeaveYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const fetchProfile = async (userId?: number) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const url = userId
        ? `${API_BASE_URL}/api/profile/user/${userId}`
        : `${API_BASE_URL}/api/auth/me`;

      const res = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile");

      setTargetUser(data.user || null);
      setProfile(data.profile || null);
      setLeaveStats(data.leaveStats || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // Initial load — own profile
  useEffect(() => {
    if (user?.id) fetchProfile();
    // eslint-disable-next-line
  }, [user?.id]);

  // When admin selects a user to view
  const handleViewUser = (userId: number) => {
    setViewingUserId(userId);
    setActiveTab("general");
    fetchProfile(userId);
  };

  const handleBackToList = () => {
    setViewingUserId(null);
    setActiveTab("manage");
    // Restore own profile data
    if (user?.id) fetchProfile();
  };

  const onSaved = () => fetchProfile(viewingUserId || undefined);

  // Determine whose profile we're editing
  const isViewingOther = !!viewingUserId;
  const editingUserId = viewingUserId || user?.id || 0;
  const editingRole = targetUser?.role || user?.status || "";
  const isEditingAdmin = user?.status === "admin";

  const tabs = TABS(isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100">
      <div className="w-full mx-auto px-3 sm:px-5 py-5 sm:py-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Profile hero card ── */}
        <Card className="border-0 shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="h-24 sm:h-16  relative">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(252, 252, 252, 0.1) 20px, rgba(255, 255, 255, 0.1) 40px)",
              }}
            />
          </div>

          <CardContent className="px-5 sm:px-8 pb-6">
            {/* Back button for admin viewing another user */}
            {isViewingOther && (
              <div className="mb-12 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToList}
                  className="gap-2 h-8 rounded-lg border-amber-300 hover:bg-amber-100"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to list
                </Button>
                <p className="text-xs text-amber-700 font-medium">
                  Viewing profile of{" "}
                  <span className="font-bold">{targetUser?.name}</span>
                </p>
              </div>
            )}

            {/* Avatar + name row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
              {/* Avatar */}
              <div className="shrink-0">
                {profile?.profile_image ? (
                  <img
                    src={`${API_BASE_URL}/${profile.profile_image}`}
                    alt={targetUser?.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 border-4 border-white shadow-xl flex items-center justify-center text-3xl sm:text-4xl font-bold text-slate-500">
                    {targetUser?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">
                    {targetUser?.name || user?.name}
                  </h1>
                  <Badge
                    className={`border-0 capitalize text-xs ${
                      editingRole === "admin"
                        ? "bg-red-50 text-red-700"
                        : editingRole === "branch_manager"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Award className="w-3 h-3 mr-1" />
                    {editingRole?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {targetUser?.bname || user?.bname}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    {targetUser?.email || user?.email || "—"}
                  </span>
                </div>
              </div>

              {/* Completeness ring */}
              <div className="sm:ml-auto shrink-0">
                <ProfileCompleteness profile={profile} />
              </div>
            </div>

            {/* Leave stats */}
            {leaveStats.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
                  Leave Balance
                </p>
                <LeaveStrip stats={leaveStats} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Tabs ── */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${
                      active
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "general" && (
            <GeneralTab
              userId={editingUserId}
              userName={targetUser?.name || user?.name || ""}
              userBranch={targetUser?.bname || user?.bname || ""}
              userRole={user?.status || ""}
              profile={profile}
              isAdmin={isEditingAdmin}
              onSaved={onSaved}
            />
          )}

          {activeTab === "documents" && (
            <UserDocuments
              userId={editingUserId}
              userRole={user?.status || ""}
              profile={profile}
              isAdmin={isEditingAdmin}
              onSaved={onSaved}
            />
          )}

          {activeTab === "security" && (
            <SecurityTab
              userId={editingUserId}
              userRole={user?.status || ""}
              profile={profile}
              isAdmin={isEditingAdmin}
              onSaved={onSaved}
            />
          )}

          {activeTab === "manage" && isAdmin && (
            <ManageUsers onViewUser={handleViewUser} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
