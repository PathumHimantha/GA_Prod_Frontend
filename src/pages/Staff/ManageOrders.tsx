// src/pages/dashboard/admin/ManageOrders.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Truck,
  FileText,
  Users,
  ExternalLink,
  CreditCard,
  Upload,
} from "lucide-react";
import { compressImage } from "@/lib/compressImage";
/* ---------------------------------- types ---------------------------------- */

type StaffOrder = {
  id: number | string;
  order_code: string;
  loan_code: string;
  product_id: string | null;
  customer_nic: string;
  customer_name: string;
  customer_address: string | null;
  customer_phone: string | null;
  customer_phone2: string | null;
  quantity: number;
  price: string | number;
  total_amount: string | number;
  week_payment: string | number;
  period_weeks: number;
  order_status: string;
  status: string;
  courier_charge: string | number;
  product_weight: string | number;
  courier_slip: string | null;
  courier_tracking_no: string | null;
  purchase_agreement: string | null;
  purchase_agreement_back: string | null;
  created_at: string;
  updated_at: string;

  loan_id: number | string | null;
  loan_full_loan: string | number | null;
  loan_month_payment: string | number | null;
  loan_period_months: number | null;
  loan_status: string | null;
  loan_date: string | null;
  due_date: string | null;
  loan_balance: string | number | null;
  due_amount: string | number | null;
  document_fee: string | number | null;
  bname: string | null;
  guarantor_1_id: string | null;
  guarantor_1_name: string | null;
  guarantor_2_id: string | null;
  guarantor_2_name: string | null;
  loan_purchase_agreement: string | null;
  loan_purchase_agreement_back: string | null;
  loan_created_at: string | null;
};

type Pagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

/* ---------------------------------- page ----------------------------------- */

const ORDER_STATUSES = [
  "pending",
  "approved",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const ManageStaffOrders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ------------------------------ load ---------------------------------- */
  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("limit", "50");
      if (orderStatusFilter && orderStatusFilter !== "all")
        params.append("order_status", orderStatusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(
        `${API_BASE_URL}/staff/orders?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load orders");

      setOrders(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, orderStatusFilter]);

  /* -------------------------- counters ---------------------------------- */
  const counters = useMemo(() => {
    return {
      pending: orders.filter((o) => o.order_status === "pending").length,
      processing: orders.filter((o) => o.order_status === "processing").length,
      shipped: orders.filter((o) => o.order_status === "shipped").length,
      delivered: orders.filter((o) => o.order_status === "delivered").length,
    };
  }, [orders]);

  /* -------------------------- actions ---------------------------------- */

  const changeStatus = async (id: number | string, order_status: string) => {
    setActionLoading(`status-${id}`);
    try {
      const res = await fetch(`${API_BASE_URL}/staff/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to update status");
      setSuccessMessage(`Order #${id} → ${order_status}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadOrders();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update status");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  /* --------------------------- status badge ---------------------------- */

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; label: string; icon: any }> = {
      pending: {
        bg: "bg-amber-100 text-amber-700 border-amber-200",
        label: "Pending",
        icon: Clock,
      },
      approved: {
        bg: "bg-green-100 text-green-700 border-green-200",
        label: "Approved",
        icon: CheckCircle,
      },
      processing: {
        bg: "bg-amber-100 text-amber-700 border-amber-200",
        label: "Processing",
        icon: Clock,
      },
      shipped: {
        bg: "bg-blue-100 text-blue-700 border-blue-200",
        label: "Shipped",
        icon: Truck,
      },
      delivered: {
        bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        label: "Delivered",
        icon: CheckCircle,
      },
      cancelled: {
        bg: "bg-red-100 text-red-700 border-red-200",
        label: "Cancelled",
        icon: XCircle,
      },
      returned: {
        bg: "bg-gray-100 text-gray-700 border-gray-200",
        label: "Returned",
        icon: XCircle,
      },
      active: {
        bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        label: "Active",
        icon: CheckCircle,
      },
      inactive: {
        bg: "bg-gray-100 text-gray-700 border-gray-200",
        label: "Inactive",
        icon: XCircle,
      },
    };
    const cfg = map[s] || map.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.bg} border text-[10px] flex items-center gap-1`}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </Badge>
    );
  };

  const money = (v: string | number | null | undefined) =>
    `Rs. ${Number(v || 0).toFixed(2)}`;
  const fmtDate = (d?: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        })
      : "—";

  /* --------------------------------- render ---------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Manage Staff Orders
            </h1>
            <p className="text-sm text-gray-500">
              Update order status, upload courier slips, view loan documents
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
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
            label="Processing"
            value={counters.processing}
            tone="orange"
          />
          <CounterCard label="Shipped" value={counters.shipped} tone="blue" />
          <CounterCard
            label="Delivered"
            value={counters.delivered}
            tone="green"
          />
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by order code, loan code, product, customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    loadOrders();
                  }
                }}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                value={orderStatusFilter}
                onValueChange={(v) => {
                  setOrderStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPage(1);
                loadOrders();
              }}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading orders…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-600">{error}</p>
            <Button className="mt-3" onClick={loadOrders}>
              Retry
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const key = String(o.id);
              const isExpanded = expanded.has(key);
              return (
                <Card key={key} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Collapsed header */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {o.product_id} — Order #{o.id}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {o.order_code}
                            </span>
                            <span>× {o.quantity}</span>
                            <span className="text-gray-400">•</span>
                            <span>{money(o.total_amount)}</span>
                            <span className="text-gray-400">•</span>
                            <span>{o.customer_name}</span>
                            <span className="text-gray-400">•</span>
                            <span>{fmtDate(o.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {statusBadge(o.order_status)}
                        {statusBadge(o.loan_status || "pending")}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggle(key)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        {/* Change status */}
                        <Section
                          title="Update order status"
                          icon={<Truck className="w-4 h-4 text-orange-500" />}
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="w-full sm:w-56">
                              <Select
                                value={o.order_status}
                                onValueChange={(v) => changeStatus(o.id, v)}
                                disabled={actionLoading === `status-${o.id}`}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ORDER_STATUSES.map((s) => (
                                    <SelectItem
                                      key={s}
                                      value={s}
                                      className="capitalize"
                                    >
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {actionLoading === `status-${o.id}` && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />{" "}
                                Updating…
                              </span>
                            )}
                          </div>
                        </Section>

                        {/* Courier */}
                        <Section
                          title="Courier & tracking"
                          icon={<Truck className="w-4 h-4 text-blue-600" />}
                        >
                          <CourierForm
                            orderId={o.id}
                            initialTracking={o.courier_tracking_no || ""}
                            currentSlipUrl={o.courier_slip}
                            onSaved={loadOrders}
                            onError={(m) => {
                              setErrorMessage(m);
                              setTimeout(() => setErrorMessage(null), 5000);
                            }}
                            onSuccess={(m) => {
                              setSuccessMessage(m);
                              setTimeout(() => setSuccessMessage(null), 4000);
                            }}
                          />
                        </Section>

                        {/* Order details */}
                        <Section
                          title="Order details"
                          icon={<Package className="w-4 h-4 text-orange-500" />}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <Detail
                              label="Order code"
                              value={o.order_code}
                              mono
                            />
                            <Detail
                              label="Loan code"
                              value={o.loan_code}
                              mono
                            />
                            <Detail
                              label="Product"
                              value={o.product_id || "—"}
                              mono
                            />
                            <Detail
                              label="Quantity"
                              value={String(o.quantity)}
                            />
                            <Detail label="Unit price" value={money(o.price)} />
                            <Detail
                              label="Total"
                              value={money(o.total_amount)}
                            />
                            <Detail
                              label="Monthly payment"
                              value={money(o.week_payment)}
                            />
                            <Detail
                              label="Period"
                              value={`${o.period_weeks} months`}
                            />
                            <Detail
                              label="Courier charge"
                              value={money(o.courier_charge)}
                            />
                            <Detail
                              label="Weight"
                              value={`${Number(o.product_weight || 0).toFixed(2)} kg`}
                            />
                            <Detail label="Customer" value={o.customer_name} />
                            <Detail label="NIC" value={o.customer_nic} mono />
                            <Detail
                              label="Address"
                              value={o.customer_address || "—"}
                            />
                            <Detail
                              label="Phone"
                              value={`${o.customer_phone || "—"}${o.customer_phone2 ? ` / ${o.customer_phone2}` : ""}`}
                            />
                          </div>
                        </Section>

                        {/* Loan details */}
                        {o.loan_id && (
                          <Section
                            title="Loan details"
                            icon={
                              <CreditCard className="w-4 h-4 text-green-600" />
                            }
                          >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <Detail
                                label="Loan code"
                                value={o.loan_code}
                                mono
                              />
                              <Detail
                                label="Loan status"
                                value={
                                  (
                                    <span className="capitalize">
                                      {o.loan_status}
                                    </span>
                                  ) as any
                                }
                              />
                              <Detail
                                label="Loan date"
                                value={fmtDate(o.loan_date)}
                              />
                              <Detail
                                label="Due date"
                                value={fmtDate(o.due_date)}
                              />
                              <Detail
                                label="Full loan"
                                value={money(o.loan_full_loan)}
                              />
                              <Detail
                                label="Monthly payment"
                                value={money(o.loan_month_payment)}
                              />
                              <Detail
                                label="Period"
                                value={`${o.loan_period_months} months`}
                              />
                              <Detail
                                label="Loan balance"
                                value={money(o.loan_balance)}
                              />
                              <Detail
                                label="Document fee"
                                value={money(o.document_fee)}
                              />
                              <Detail
                                label="Due amount"
                                value={money(o.due_amount)}
                              />
                              <Detail label="Branch" value={o.bname || "—"} />
                            </div>
                          </Section>
                        )}

                        {/* Guarantors */}
                        {(o.guarantor_1_name || o.guarantor_2_name) && (
                          <Section
                            title="Guarantors"
                            icon={<Users className="w-4 h-4 text-purple-600" />}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="bg-white border rounded-lg p-3">
                                <p className="text-xs text-gray-500">
                                  Guarantor 1
                                </p>
                                <p className="font-medium">
                                  {o.guarantor_1_name || "—"}
                                </p>
                                {o.guarantor_1_id && (
                                  <p className="text-xs text-gray-400">
                                    ID: {o.guarantor_1_id}
                                  </p>
                                )}
                              </div>
                              <div className="bg-white border rounded-lg p-3">
                                <p className="text-xs text-gray-500">
                                  Guarantor 2
                                </p>
                                <p className="font-medium">
                                  {o.guarantor_2_name || "—"}
                                </p>
                                {o.guarantor_2_id && (
                                  <p className="text-xs text-gray-400">
                                    ID: {o.guarantor_2_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Section>
                        )}

                        {/* Documents */}
                        <Section
                          title="Documents"
                          icon={<FileText className="w-4 h-4 text-blue-600" />}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DocLink
                              label="Purchase agreement (front)"
                              href={
                                o.purchase_agreement ||
                                o.loan_purchase_agreement
                              }
                            />
                            <DocLink
                              label="Purchase agreement (back)"
                              href={
                                o.purchase_agreement_back ||
                                o.loan_purchase_agreement_back
                              }
                            />
                            <DocLink
                              label="Courier slip"
                              href={o.courier_slip}
                            />
                          </div>
                        </Section>
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

/* ------------------------- courier form sub-component ----------------------- */

const CourierForm = ({
  orderId,
  initialTracking,
  currentSlipUrl,
  onSaved,
  onError,
  onSuccess,
}: {
  orderId: number | string;
  initialTracking: string;
  currentSlipUrl: string | null;
  onSaved: () => Promise<void> | void;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
}) => {
  const [tracking, setTracking] = useState(initialTracking);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTracking(initialTracking);
  }, [initialTracking]);

  const handleSave = async () => {
    if (!file && tracking === initialTracking) {
      onError("Nothing to update — change tracking or pick a slip.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("courier_tracking_no", tracking.trim());

      if (file) {
        // ✅ Compress image before upload (skip for PDFs)
        let payload: File = file;
        if (file.type.startsWith("image/")) {
          payload = await compressImage(file, {
            maxSizeMB: 0.9, // keep it well under 1 MB
            maxWidthOrHeight: 1600,
            initialQuality: 0.85,
          });
        }
        form.append("courier_slip", payload);
      }

      const res = await fetch(
        `${API_BASE_URL}/staff/orders/${orderId}/courier`,
        {
          method: "POST",
          body: form,
        },
      );
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to save");

      onSuccess(`Courier info saved for order #${orderId}`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await onSaved();
    } catch (err: any) {
      onError(err.message || "Failed to save courier info");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Tracking number
          </Label>
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="e.g. SP18235164"
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Courier slip
          </Label>
          <label
            className={`mt-1 flex items-center justify-center gap-2 h-10 w-full border-2 border-dashed rounded-lg cursor-pointer text-sm transition-colors ${
              file
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-gray-300 bg-white hover:bg-gray-50 text-gray-500"
            } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
            <Upload className="w-4 h-4" />
            <span className="truncate max-w-[70%]">
              {file ? file.name : "Click to upload (JPG/PNG/PDF)"}
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={submitting}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1" /> Save courier info
            </>
          )}
        </Button>
        {currentSlipUrl && (
          <a
            href={currentSlipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View current slip
          </a>
        )}
      </div>
    </div>
  );
};

/* ------------------------------- helpers ----------------------------------- */

const CounterCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "red" | "blue" | "orange";
}) => {
  const map = {
    amber: "border-l-amber-500 text-amber-600",
    green: "border-l-emerald-500 text-emerald-600",
    red: "border-l-red-500 text-red-600",
    blue: "border-l-blue-500 text-blue-600",
    orange: "border-l-orange-500 text-orange-600",
  } as const;
  return (
    <Card className={`bg-white border-l-4 ${map[tone].split(" ")[0]}`}>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${map[tone].split(" ")[1]}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
};

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div>
    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
      {icon}
      {title}
    </h4>
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      {children}
    </div>
  </div>
);

const Detail = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p
      className={`text-sm font-medium text-gray-900 truncate ${mono ? "font-mono" : ""}`}
    >
      {value}
    </p>
  </div>
);

const DocLink = ({ label, href }: { label: string; href: string | null }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    {href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline truncate max-w-full"
      >
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">View document</span>
      </a>
    ) : (
      <p className="text-sm text-gray-400">—</p>
    )}
  </div>
);

export default ManageStaffOrders;
