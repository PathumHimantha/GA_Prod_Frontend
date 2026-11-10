import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Wallet,
  Image as ImageIcon,
} from "lucide-react";
import PreviewDialog, { PreviewInfo } from "@/components/PreviewDialog";

type ApprovalRow = {
  id: number;
  loan_code: string;
  staff_user_id: number;
  staff_name: string;
  bname: string;
  actor_role: string;
  product_ids: string;
  product_codes: string;
  total_amount: string | number;
  period_months: number;
  level_number: number;
  required_role: "branch_manager" | "rm" | "admin";
  required_branch: string | null;
  status: "pending" | "approved" | "rejected" | "skipped";
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;

  // joined from staff_product_loan
  full_loan?: string | number | null;
  week_payment?: string | number | null;
  period_weeks?: number | null;
  customer_nic?: string | null;
  customer_name?: string | null;
  purchase_agreement?: string | null;
  purchase_agreement_back?: string | null;
  guarantor_1_name?: string | null;
  guarantor_2_name?: string | null;
  product_name?: string | null;
  cart_product_code?: string | null;
  quantity?: number | null;
  price?: string | number | null;
  guarantor_1_id?: string | number | null;
  guarantor_2_id?: string | number | null;
  cart_notes?: string | null;
};

const fmtMoney = (v: any) =>
  `Rs. ${Number(v || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const StaffLoanApprovals = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  // preview
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/staff/approvals/pending`, {
        credentials: "include",
        headers: {
          // if your app uses an x-user-id shim instead of JWT cookies:
          "x-user-id": String(user?.id || ""),
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load approvals");
      }
      setRows(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!user?.id) return;
    const loadUserNames = async () => {
      try {
        const params = new URLSearchParams();
        if (user.role) params.append("role", String(user.role));
        if (user.bname) params.append("bname", String(user.bname));

        const res = await fetch(
          `${API_BASE_URL}/staff/active_users?${params.toString()}`,
        );
        if (!res.ok) return;
        const data = await res.json();

        const map: Record<string, string> = {};
        for (const u of data.users || []) map[String(u.id)] = u.name;
        setUserNames(map);
      } catch (err) {
        console.error("Guarantor name load error:", err);
      }
    };
    loadUserNames();
  }, [user?.id, user?.role, user?.bname]);

  const guarantorName = (id?: string | number | null) =>
    id ? userNames[String(id)] || `User #${id}` : "—";
  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const act = async (id: number, action: "approved" | "rejected") => {
    setActingOn(id);
    try {
      let reason: string | null = null;
      if (action === "rejected") {
        reason = window.prompt("Reason for rejecting this loan?") || "";
        if (!reason.trim()) {
          setActingOn(null);
          return;
        }
      }
      const res = await fetch(`${API_BASE_URL}/staff/approvals/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(user?.id || ""),
        },
        credentials: "include",
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update approval");
      }
      // Optimistic: remove the row
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to update approval");
      setTimeout(() => setError(null), 4000);
    } finally {
      setActingOn(null);
    }
  };

  // Group by loan_code so Level 1 and Level 2 for the same loan are visible together
  const grouped = useMemo(() => {
    const map = new Map<string, ApprovalRow[]>();
    for (const r of rows) {
      const key = r.loan_code || `no-loan-${r.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // sort each group by level_number
    for (const list of map.values())
      list.sort((a, b) => a.level_number - b.level_number);
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6 mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Staff Loan Approvals
            </h1>
            <p className="text-sm text-gray-500">
              Only the next required approver sees each loan. Level 2 opens once
              Level 1 is approved.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="py-16 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <span className="text-sm text-gray-500">Loading approvals…</span>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No approvals pending for you
            </h3>
            <p className="text-gray-500 mt-1">
              When a loan reaches your level, it will appear here.
            </p>
          </div>
        )}

        {!loading && grouped.length > 0 && (
          <div className="space-y-4">
            {grouped.map(([loanCode, list]) => {
              const head = list[0];
              const months = Number(head.period_months) || 0;
              const fullLoan = Number(head.full_loan ?? head.total_amount ?? 0);
              const monthly_payment = months > 0 ? fullLoan / months : 0;

              return (
                <Card key={loanCode} className="bg-white">
                  <CardContent className="p-4 sm:p-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4 border-b pb-4">
                      {/* <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                          Loan Code
                        </p>
                        <p className="text-base font-bold text-gray-900 font-mono">
                          {loanCode}
                        </p>
                      </div> */}
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                          Staff
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                          {head.staff_name}{" "}
                          <span className="text-xs text-gray-400">
                            ({head.actor_role}, {head.bname})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                          Amount
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {fmtMoney(head.full_loan ?? head.total_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                          Period
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                          {head.period_months} months
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 font-medium">
                          Monthly
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                          {fmtMoney(monthly_payment)}
                        </p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                      <div>
                        <p className="text-gray-400">Product Code</p>
                        <p className="text-gray-800">
                          {head.cart_product_code || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Product Name</p>
                        <p className="text-gray-800">
                          {head.product_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Guarantor 1</p>
                        <p className="text-gray-800">
                          {guarantorName(head.guarantor_1_id)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Guarantor 2</p>
                        <p className="text-gray-800">
                          {guarantorName(head.guarantor_2_id)}
                        </p>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="flex items-center gap-3 mb-4">
                      {head.purchase_agreement && (
                        <button
                          type="button"
                          onClick={() => {
                            setRotation(0);
                            setZoom(1);
                            setPreview({
                              label: `Purchase Agreement (Front) — ${loanCode}`,
                              url: head.purchase_agreement!,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Front
                        </button>
                      )}
                      {head.purchase_agreement_back && (
                        <button
                          type="button"
                          onClick={() => {
                            setRotation(0);
                            setZoom(1);
                            setPreview({
                              label: `Purchase Agreement (Back) — ${loanCode}`,
                              url: head.purchase_agreement_back!,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Back
                        </button>
                      )}
                    </div>

                    {/* Approval slots */}
                    <div className="space-y-2">
                      {list.map((slot) => {
                        const isActionable = slot.status === "pending";
                        return (
                          <div
                            key={slot.id}
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                              isActionable
                                ? "border-orange-200 bg-orange-50"
                                : slot.status === "approved"
                                  ? "border-green-200 bg-green-50"
                                  : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-xs font-bold text-gray-700">
                                L{slot.level_number}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {slot.required_role
                                    .replace(/_/g, " ")
                                    .toUpperCase()}
                                  {slot.required_branch
                                    ? ` — ${slot.required_branch}`
                                    : ""}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {slot.status === "pending" &&
                                    "Awaiting decision"}
                                  {slot.status === "approved" &&
                                    `Approved by ${slot.approved_by_name || "—"} on ${fmtDate(slot.approved_at || "")}`}
                                  {slot.status === "rejected" &&
                                    `Rejected by ${slot.approved_by_name || "—"}${slot.rejected_reason ? ` — ${slot.rejected_reason}` : ""}`}
                                  {slot.status === "skipped" &&
                                    "Skipped (loan rejected at an earlier level)"}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={
                                slot.status === "approved"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : slot.status === "rejected"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : slot.status === "skipped"
                                      ? "bg-gray-100 text-gray-600 border-gray-200"
                                      : "bg-amber-100 text-amber-700 border-amber-200"
                              }
                            >
                              {slot.status}
                            </Badge>
                            {isActionable && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={actingOn === slot.id}
                                  onClick={() => act(slot.id, "approved")}
                                >
                                  {actingOn === slot.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1" />{" "}
                                      Approve
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={actingOn === slot.id}
                                  onClick={() => act(slot.id, "rejected")}
                                >
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Submitted {fmtDate(head.created_at)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PreviewDialog
        preview={preview}
        onClose={() => {
          setPreview(null);
          setRotation(0);
          setZoom(1);
        }}
        rotation={rotation}
        setRotation={setRotation}
        zoom={zoom}
        setZoom={setZoom}
      />
    </div>
  );
};

export default StaffLoanApprovals;
