// src/pages/dashboard/admin/StaffRequestOrder.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/apiConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Package,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  MessageSquare,
} from "lucide-react";

/* ---------------------------------- types ---------------------------------- */

type StaffRequest = {
  id: number | string;
  staff_user_id: number | string;
  staff_name: string;
  product_id: number | string;
  product_code: string;
  product_name: string;
  quantity: number;
  guarantor_1: string | null;
  guarantor_2: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "fulfilled" | "cancelled";
  created_at: string;
  updated_at: string;
};

type Pagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

/* ---------------------------------- page ----------------------------------- */

const StaffRequestOrder = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ------------------------------ load data ------------------------------ */

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("limit", "50");
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(
        `${API_BASE_URL}/staff/requests?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to load staff requests");
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Failed to load requests");

      setRequests(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  /* -------------------------- status counters ---------------------------- */

  const counters = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const fulfilled = requests.filter((r) => r.status === "fulfilled").length;
    return { pending, approved, rejected, fulfilled };
  }, [requests]);

  /* ----------------------------- actions -------------------------------- */

  const updateStatus = async (
    id: number | string,
    status: "rejected" | "cancelled" | "fulfilled",
  ) => {
    if (status === "rejected" && !confirm("Reject this request?")) return;
    setActionLoading(`status-${id}`);
    try {
      const res = await fetch(`${API_BASE_URL}/staff/requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }
      setSuccessMessage(`Request #${id} marked as ${status}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadRequests();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update status");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const approveRequest = async (id: number | string) => {
    if (!confirm("Approve this request and add it to the staff cart?")) return;
    setActionLoading(`approve-${id}`);
    try {
      const res = await fetch(`${API_BASE_URL}/staff/requests/${id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve request");
      }
      setSuccessMessage(`Request #${id} approved and added to staff cart.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadRequests();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to approve request");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  /* --------------------------- status helpers ---------------------------- */

  const badgeForStatus = (s: StaffRequest["status"]) => {
    const map = {
      pending: {
        bg: "bg-amber-100 text-amber-700 border-amber-200",
        icon: Clock,
        label: "Pending",
      },
      approved: {
        bg: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircle,
        label: "Approved",
      },
      rejected: {
        bg: "bg-red-100 text-red-700 border-red-200",
        icon: XCircle,
        label: "Rejected",
      },
      fulfilled: {
        bg: "bg-blue-100 text-blue-700 border-blue-200",
        icon: CheckCircle,
        label: "Fulfilled",
      },
      cancelled: {
        bg: "bg-gray-100 text-gray-700 border-gray-200",
        icon: XCircle,
        label: "Cancelled",
      },
    } as const;
    const cfg = map[s] || map.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.bg} border text-[10px] flex items-center gap-1`}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </Badge>
    );
  };
  /* ------------------------ load guarantor lookup ------------------------ */

  const [guarantorMap, setGuarantorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/staff/active_users`);
        if (!res.ok) return;
        const data = await res.json();
        const users: { id: number | string; name: string }[] = data.users || [];
        const map: Record<string, string> = {};
        users.forEach((u) => {
          map[String(u.id)] = u.name;
        });
        setGuarantorMap(map);
      } catch {
        // silent — fallback to showing #id
      }
    })();
  }, []);

  // helper
  const guarantorName = (id?: string | null) =>
    id ? guarantorMap[String(id)] || `#${id}` : "—";
  /* --------------------------------- render ------------------------------ */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-500" />
              Staff Request Orders
            </h1>
            <p className="text-sm text-gray-500">
              Review and process staff product requests
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)}>
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)}>
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <CounterCard label="Pending" value={counters.pending} tone="amber" />
          <CounterCard
            label="Approved"
            value={counters.approved}
            tone="green"
          />
          <CounterCard label="Rejected" value={counters.rejected} tone="red" />
          <CounterCard
            label="Fulfilled"
            value={counters.fulfilled}
            tone="blue"
          />
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by staff, product, code, or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    loadRequests();
                  }
                }}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPage(1);
                loadRequests();
              }}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading requests…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-600">{error}</p>
            <Button className="mt-3" onClick={loadRequests}>
              Retry
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No staff requests found</p>
            <p className="text-sm text-gray-500">
              Requests will appear here when staff submit them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const key = String(r.id);
              const isExpanded = expanded.has(key);
              const isPending = r.status === "pending";

              return (
                <Card key={key} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Row header */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {r.product_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {r.product_code}
                            </span>
                            <span>× {r.quantity}</span>
                            <span className="text-gray-400">•</span>
                            <span>By {r.staff_name}</span>
                            <span className="text-gray-400">•</span>
                            <span>
                              {new Date(r.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {badgeForStatus(r.status)}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpand(key)}
                          className="text-gray-500"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <DetailField
                            label="Staff ID"
                            value={String(r.staff_user_id)}
                          />
                          <DetailField
                            label="Guarantor 1"
                            value={guarantorName(r.guarantor_1)}
                          />
                          <DetailField
                            label="Guarantor 2"
                            value={guarantorName(r.guarantor_2)}
                          />
                          <DetailField
                            label="Product ID"
                            value={String(r.product_id)}
                          />
                          <DetailField
                            label="Request ID"
                            value={String(r.id)}
                          />
                          <DetailField
                            label="Last updated"
                            value={new Date(r.updated_at).toLocaleString()}
                          />
                        </div>

                        {r.notes && (
                          <div className="mt-3 flex items-start gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-2.5">
                            <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span>{r.notes}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                disabled={actionLoading === `approve-${r.id}`}
                                onClick={() => approveRequest(r.id)}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                {actionLoading === `approve-${r.id}` ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                )}
                                Approve & Add to Cart
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === `status-${r.id}`}
                                onClick={() => updateStatus(r.id, "rejected")}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                {actionLoading === `status-${r.id}` ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4 mr-1" />
                                )}
                                Reject
                              </Button>
                            </>
                          )}

                          {r.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === `status-${r.id}`}
                              onClick={() => updateStatus(r.id, "fulfilled")}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Fulfilled
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages} —{" "}
              {pagination.totalItems} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  pagination.currentPage >= pagination.totalPages || loading
                }
                onClick={() =>
                  setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------ helper UI -------------------------------- */

const CounterCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "red" | "blue";
}) => {
  const map = {
    amber: "border-l-amber-500 text-amber-600 bg-amber-50",
    green: "border-l-green-500 text-green-600 bg-green-50",
    red: "border-l-red-500 text-red-600 bg-red-50",
    blue: "border-l-blue-500 text-blue-600 bg-blue-50",
  } as const;
  const [border, text, bg] = map[tone].split(" ");
  return (
    <Card className={`bg-white border-l-4 ${border}`}>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${text}`}>{value}</p>
      </CardContent>
    </Card>
  );
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <Label className="text-xs text-gray-500">{label}</Label>
    <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
  </div>
);

export default StaffRequestOrder;
