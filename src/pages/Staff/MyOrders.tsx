// src/pages/dashboard/staff/MyOrders.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  CalendarDays,
  CreditCard,
  Truck,
  ExternalLink,
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

type StaffOrder = {
  order_id: number | string;
  order_code: string;
  loan_code: string;
  product_code: string;
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
  record_status: string;
  courier_charge: string | number;
  product_weight: string | number;
  courier_slip: string | null;
  courier_tracking_no: string | null;
  purchase_agreement: string | null;
  purchase_agreement_back: string | null;
  order_created_at: string;
  order_updated_at: string;

  loan_id: number | string | null;
  loan_total_amount: string | number | null;
  loan_full_loan: string | number | null;
  loan_month_payment: string | number | null;
  loan_period_months: number | null;
  loan_status: string | null;
  loan_date: string | null;
  due_date: string | null;
  loan_balance: string | number | null;
  due_amount: string | number | null;
  document_fee: string | number | null;
  loan_courier_charge: string | number | null;
  bname: string | null;
  guarantor_1_id: string | null;
  guarantor_1_name: string | null;
  guarantor_2_id: string | null;
  guarantor_2_name: string | null;
  loan_purchase_agreement: string | null;
  loan_purchase_agreement_back: string | null;
  loan_created_at: string | null;
  payments?: {
    id: number | string;
    loan_code: string;
    order_code: string | null;
    customer_nic: string;
    customer_name: string;
    payment: string | number;
    week_payment: string | number;
    payment_date: string;
    bname: string | null;
    created_at: string;
    updated_at: string;
  }[];
  payments_total_paid?: number;
  payments_count?: number;
};

/* ---------------------------------- page ----------------------------------- */

const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const staffId = user?.id;

  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadingOrd, setLoadingOrd] = useState(true);
  const [errReq, setErrReq] = useState<string | null>(null);
  const [errOrd, setErrOrd] = useState<string | null>(null);

  const [expandedReq, setExpandedReq] = useState<Set<string>>(new Set());
  const [expandedOrd, setExpandedOrd] = useState<Set<string>>(new Set());

  /* ---------------------------- load requests ---------------------------- */
  useEffect(() => {
    if (!staffId) return;
    (async () => {
      setLoadingReq(true);
      setErrReq(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/staff/my-requests/${encodeURIComponent(String(staffId))}`,
        );
        if (!res.ok) throw new Error("Failed to load requests");
        const data = await res.json();
        if (!data.success)
          throw new Error(data.error || "Failed to load requests");
        setRequests(data.data || []);
      } catch (err: any) {
        setErrReq(err.message || "Failed to load requests");
      } finally {
        setLoadingReq(false);
      }
    })();
  }, [staffId]);

  /* ---------------------------- load orders ------------------------------ */
  useEffect(() => {
    if (!staffId) return;
    (async () => {
      setLoadingOrd(true);
      setErrOrd(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/staff/my-orders/${encodeURIComponent(String(staffId))}`,
        );
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        if (!data.success)
          throw new Error(data.error || "Failed to load orders");
        setOrders(data.data || []);
      } catch (err: any) {
        setErrOrd(err.message || "Failed to load orders");
      } finally {
        setLoadingOrd(false);
      }
    })();
  }, [staffId]);

  /* ----------------------------- counters ------------------------------- */
  const reqCounters = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      fulfilled: requests.filter((r) => r.status === "fulfilled").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const ordCounters = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter((o) => o.loan_status === "active").length,
      pending: orders.filter((o) => o.order_status === "pending").length,
      delivered: orders.filter((o) => o.order_status === "delivered").length,
    };
  }, [orders]);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    key: string,
  ) => {
    setter((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  /* ------------------------------ helpers ------------------------------- */

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
      rejected: {
        bg: "bg-red-100 text-red-700 border-red-200",
        label: "Rejected",
        icon: XCircle,
      },
      fulfilled: {
        bg: "bg-blue-100 text-blue-700 border-blue-200",
        label: "Fulfilled",
        icon: CheckCircle,
      },
      cancelled: {
        bg: "bg-gray-100 text-gray-700 border-gray-200",
        label: "Cancelled",
        icon: XCircle,
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
        bg: "bg-green-100 text-green-700 border-green-200",
        label: "Delivered",
        icon: CheckCircle,
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

  /* --------------------------------- render ----------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-orange-500" />
              My Orders
            </h1>
            <p className="text-sm text-gray-500">
              Your staff requests and purchased product loans
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/staff-store")}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store
          </Button>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="mb-4 bg-white border">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Requests
              {reqCounters.pending > 0 && (
                <span className="ml-1 text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                  {reqCounters.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="purchased" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Purchased Products
              {orders.length > 0 && (
                <span className="ml-1 text-[10px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                  {orders.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ================ REQUESTS TAB ================ */}
          <TabsContent value="requests">
            {loadingReq ? (
              <LoadingBlock label="Loading your requests…" />
            ) : errReq ? (
              <ErrorBlock message={errReq} />
            ) : requests.length === 0 ? (
              <EmptyBlock
                icon={<Package className="w-10 h-10 text-gray-400" />}
                title="No requests yet"
                subtitle="Out-of-stock products you request will appear here."
              />
            ) : (
              <div className="space-y-3">
                {requests.map((r) => {
                  const key = String(r.id);
                  const isExpanded = expandedReq.has(key);
                  return (
                    <Card key={key} className="overflow-hidden">
                      <CardContent className="p-0">
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
                                <span>
                                  Requested{" "}
                                  {new Date(r.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {statusBadge(r.status)}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggle(setExpandedReq, key)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <Detail label="Request #" value={String(r.id)} />
                            <Detail label="Staff" value={r.staff_name} />
                            <Detail
                              label="Last updated"
                              value={new Date(r.updated_at).toLocaleString()}
                            />
                            <Detail
                              label="Guarantor 1"
                              value={r.guarantor_1 || "—"}
                            />
                            <Detail
                              label="Guarantor 2"
                              value={r.guarantor_2 || "—"}
                            />
                            {r.notes && (
                              <div className="md:col-span-3">
                                <p className="text-xs text-gray-500 mb-1">
                                  Notes
                                </p>
                                <p className="bg-white border rounded p-2 text-gray-700">
                                  {r.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ================ PURCHASED TAB ================ */}
          <TabsContent value="purchased">
            {loadingOrd ? (
              <LoadingBlock label="Loading your purchases…" />
            ) : errOrd ? (
              <ErrorBlock message={errOrd} />
            ) : orders.length === 0 ? (
              <EmptyBlock
                icon={<ShoppingBag className="w-10 h-10 text-gray-400" />}
                title="No purchases yet"
                subtitle="Products you buy with a staff loan will appear here."
              />
            ) : (
              <>
                {/* Mini summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <MiniStat
                    label="Total orders"
                    value={String(ordCounters.total)}
                    tint="bg-orange-50 text-orange-600"
                  />
                  <MiniStat
                    label="Active loans"
                    value={String(ordCounters.active)}
                    tint="bg-emerald-50 text-emerald-600"
                  />
                  <MiniStat
                    label="In processing"
                    value={String(ordCounters.pending)}
                    tint="bg-amber-50 text-amber-600"
                  />
                  <MiniStat
                    label="Delivered"
                    value={String(ordCounters.delivered)}
                    tint="bg-blue-50 text-blue-600"
                  />
                </div>

                <div className="space-y-3">
                  {orders.map((o) => {
                    const key = String(o.order_id);
                    const isExpanded = expandedOrd.has(key);
                    const img = o.purchase_agreement;
                    return (
                      <Card key={key} className="overflow-hidden">
                        <CardContent className="p-0">
                          {/* Collapsed row */}
                          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {o.product_code || "Product"} — Order #
                                  {o.order_id}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                    {o.order_code}
                                  </span>
                                  <span>× {o.quantity}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{money(o.total_amount)}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{fmtDate(o.order_created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              {statusBadge(o.order_status)}
                              {statusBadge(o.loan_status || "pending")}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggle(setExpandedOrd, key)}
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
                              {/* Order details */}
                              <Section
                                title="Order details"
                                icon={
                                  <Package className="w-4 h-4 text-orange-500" />
                                }
                              >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <Detail
                                    label="Order code"
                                    value={o.order_code}
                                    mono
                                  />
                                  <Detail
                                    label="Product code"
                                    value={o.product_code || "—"}
                                    mono
                                  />
                                  <Detail
                                    label="Quantity"
                                    value={String(o.quantity)}
                                  />
                                  <Detail
                                    label="Unit price"
                                    value={money(o.price)}
                                  />
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
                                    label="Ordered on"
                                    value={fmtDate(o.order_created_at)}
                                  />
                                  <Detail
                                    label="Courier charge"
                                    value={money(o.courier_charge)}
                                  />
                                  <Detail
                                    label="Weight"
                                    value={`${Number(o.product_weight || 0).toFixed(2)} kg`}
                                  />
                                  <Detail
                                    label="Courier tracking"
                                    value={o.courier_tracking_no || "—"}
                                  />
                                  <Detail
                                    label="Courier slip"
                                    value={o.courier_slip ? "Available" : "—"}
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
                                      label="Total amount"
                                      value={money(o.loan_total_amount)}
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
                                      label="Branch"
                                      value={o.bname || "—"}
                                    />
                                    <Detail
                                      label="Due amount"
                                      value={money(o.due_amount)}
                                    />
                                  </div>
                                </Section>
                              )}

                              {/* Guarantors */}
                              {(o.guarantor_1_name || o.guarantor_2_name) && (
                                <Section
                                  title="Guarantors"
                                  icon={
                                    <Users className="w-4 h-4 text-purple-600" />
                                  }
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="bg-white border rounded-lg p-3">
                                      <p className="text-xs text-gray-500 mb-1">
                                        Guarantor 1
                                      </p>
                                      <p className="font-medium">
                                        {o.guarantor_1_name || "—"}
                                      </p>
                                      {o.guarantor_1_id && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          ID: {o.guarantor_1_id}
                                        </p>
                                      )}
                                    </div>
                                    <div className="bg-white border rounded-lg p-3">
                                      <p className="text-xs text-gray-500 mb-1">
                                        Guarantor 2
                                      </p>
                                      <p className="font-medium">
                                        {o.guarantor_2_name || "—"}
                                      </p>
                                      {o.guarantor_2_id && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          ID: {o.guarantor_2_id}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </Section>
                              )}

                              {/* Documents */}
                              {(o.purchase_agreement ||
                                o.purchase_agreement_back) && (
                                <Section
                                  title="Documents"
                                  icon={
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  }
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <DocLink
                                      label="Purchase agreement (front)"
                                      href={o.purchase_agreement}
                                    />
                                    <DocLink
                                      label="Purchase agreement (back)"
                                      href={o.purchase_agreement_back}
                                    />
                                    <DocLink
                                      label="Courier slip"
                                      href={o.courier_slip}
                                    />
                                    {o.courier_tracking_no && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">
                                          Courier tracking #
                                        </p>
                                        <p className="text-sm font-mono font-medium text-gray-900">
                                          {o.courier_tracking_no}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </Section>
                              )}

                              {/* Delivery */}
                              <Section
                                title="Delivery"
                                icon={
                                  <Truck className="w-4 h-4 text-orange-600" />
                                }
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <Detail
                                    label="Ship to"
                                    value={o.customer_address || "—"}
                                  />
                                  <Detail
                                    label="Contact"
                                    value={`${o.customer_phone || "—"}${o.customer_phone2 ? ` / ${o.customer_phone2}` : ""}`}
                                  />
                                </div>
                              </Section>
                              {/* Payments */}
                              {o.loan_id && (
                                <Section
                                  title={`Payments (${o.payments_count || 0})`}
                                  icon={
                                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                                  }
                                >
                                  {/* Summary row */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                                    <Detail
                                      label="Monthly payment"
                                      value={money(o.week_payment)}
                                    />
                                    <Detail
                                      label="Paid so far"
                                      value={money(o.payments_total_paid ?? 0)}
                                    />
                                    <Detail
                                      label="Remaining balance"
                                      value={money(o.loan_balance)}
                                    />
                                    <Detail
                                      label="Total due"
                                      value={money(o.due_amount)}
                                    />
                                  </div>

                                  {/* Payment list */}
                                  {o.payments && o.payments.length > 0 ? (
                                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                                              #
                                            </th>
                                            <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                                              Payment date
                                            </th>
                                            <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                                              Order code
                                            </th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">
                                              Monthly
                                            </th>
                                            <th className="text-right px-3 py-2 font-medium text-gray-600 text-xs">
                                              Paid
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {o.payments.map((p, idx) => (
                                            <tr
                                              key={String(p.id)}
                                              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                                            >
                                              <td className="px-3 py-2 text-gray-500">
                                                {idx + 1}
                                              </td>
                                              <td className="px-3 py-2 text-gray-900">
                                                {fmtDate(p.payment_date)}
                                              </td>
                                              <td className="px-3 py-2 font-mono text-xs text-gray-600">
                                                {p.order_code || "—"}
                                              </td>
                                              <td className="px-3 py-2 text-right text-gray-600">
                                                {money(p.week_payment)}
                                              </td>
                                              <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                                                {money(p.payment)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr className="border-t border-gray-200 bg-gray-50">
                                            <td
                                              colSpan={4}
                                              className="px-3 py-2 text-right font-medium text-gray-700 text-xs"
                                            >
                                              Total paid
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                              {money(
                                                o.payments_total_paid ?? 0,
                                              )}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 text-center py-3">
                                      No payments recorded yet. First payment is
                                      due on the 25th.
                                    </p>
                                  )}
                                </Section>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* ------------------------------ helper UI -------------------------------- */

const LoadingBlock = ({ label }: { label: string }) => (
  <div className="text-center py-16 bg-white rounded-xl border">
    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
    <p className="text-gray-500">{label}</p>
  </div>
);

const ErrorBlock = ({ message }: { message: string }) => (
  <div className="text-center py-16 bg-white rounded-xl border">
    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
    <p className="text-red-600">{message}</p>
  </div>
);

const EmptyBlock = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="text-center py-16 bg-white rounded-xl border">
    <div className="mx-auto mb-3 w-fit">{icon}</div>
    <p className="text-gray-700 font-medium">{title}</p>
    <p className="text-sm text-gray-500">{subtitle}</p>
  </div>
);

const MiniStat = ({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) => (
  <Card className="bg-white">
    <CardContent className="p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${tint.split(" ")[1]}`}>{value}</p>
    </CardContent>
  </Card>
);

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

export default MyOrders;
