// src/pages/dashboard/staff/BuyForMyself.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/contexts/AuthContext";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import {
  ShoppingCart,
  Package,
  User,
  Phone,
  MapPin,
  CreditCard,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  X,
  Clock,
  Upload,
  FileImage,
  Users,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { compressImage } from "@/lib/compressImage";
/* ---------------------------------- types ---------------------------------- */

type StaffCartItem = {
  id: number | string;
  product_id: number | string; // numeric products.id
  product_code: string; // products.product_id
  product_name: string;
  quantity: number;
  price: string | number;
  total_amount: string | number;
  guarantor_1: string | null;
  guarantor_2: string | null;
  status: "pending" | "approved" | "rejected" | "purchased" | "cancelled";
  created_at: string;
  images?: string[];
  category?: string;
  product_weight?: string | number;
  courier_fee?: string | number;
};

type StaffCartResponse = {
  success: boolean;
  data: StaffCartItem[];
  error?: string;
};

type ExecutiveProfile = {
  id?: number | string;
  user_id?: number | string;
  nic?: string | null;
  address?: string | null;
  contact_company?: string | null;
  contact_personal?: string | null;
};

/* -------------------------------- constants -------------------------------- */

const PERIOD_MONTHS = 6;
const DOCUMENT_FEE_TIERS = [
  { min: 30000.0001, fee: 1500 },
  { min: 15000, fee: 1000 },
  { min: 0, fee: 500 },
];

const calculateDocumentFee = (totalAmount: number) => {
  const tier = DOCUMENT_FEE_TIERS.find((t) => totalAmount >= t.min);
  return tier ? tier.fee : 500;
};

/* ---------------------------------- page ----------------------------------- */

const BuyForMyself = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<StaffCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // form fields
  const [nic, setNic] = useState("");
  const [address, setAddress] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // guarantors
  const [guarantorOptions, setGuarantorOptions] = useState<SelectOption[]>([]);
  const [guarantorOptionsLoading, setGuarantorOptionsLoading] = useState(false);
  const [guarantor1Id, setGuarantor1Id] = useState("");
  const [guarantor2Id, setGuarantor2Id] = useState("");

  // purchase agreement photos
  const [agreementFront, setAgreementFront] = useState<File | null>(null);
  const [agreementBack, setAgreementBack] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<any>(null);

  const staffId = user?.id;
  const staffName = user?.name || "";
  const staffBname = (user as any)?.bname || "";

  /* ------------------------------- load cart -------------------------------- */

  useEffect(() => {
    if (!staffId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/staff/cart/${encodeURIComponent(String(staffId))}`,
        );
        if (!res.ok) throw new Error("Failed to fetch staff cart");
        const data: StaffCartResponse = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to load cart");
        setItems(data.data || []);
        setExpanded(new Set((data.data || []).map((i) => String(i.id))));
      } catch (err: any) {
        setError(err.message || "Failed to load cart");
      } finally {
        setLoading(false);
      }
    })();
  }, [staffId]);

  /* -------------------- load executive_profile (prefill) -------------------- */

  useEffect(() => {
    if (!staffId) return;
    (async () => {
      setProfileLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/staff/executive_profile/${encodeURIComponent(
            String(staffId),
          )}`,
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const profile: ExecutiveProfile | null = data?.data || null;

        if (profile) {
          if (profile.nic) setNic(String(profile.nic).toUpperCase());
          if (profile.address) setAddress(String(profile.address));
          const comp = profile.contact_company
            ? String(profile.contact_company)
            : "";
          const pers = profile.contact_personal
            ? String(profile.contact_personal)
            : "";
          if (comp) setPhone1(comp);
          else if (pers) setPhone1(pers);
          if (pers && comp) setPhone2(pers);
        }
      } catch {
        // silent — user can still fill manually
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [staffId]);

  /* ---------------------------- load guarantors ----------------------------- */

  useEffect(() => {
    if (!user) return;
    (async () => {
      setGuarantorOptionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (user.role) params.append("role", String(user.role));
        if (user.bname) params.append("bname", String(user.bname));

        const res = await fetch(
          `${API_BASE_URL}/staff/active_users?${params.toString()}`,
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const users: { id: number | string; name: string }[] = data.users || [];

        setGuarantorOptions(
          users
            .filter((u) => String(u.id) !== String(staffId))
            .map((u) => ({
              bcode: String(u.id),
              label: u.name,
              value: String(u.id),
            })),
        );
      } catch {
        setGuarantorOptions([]);
      } finally {
        setGuarantorOptionsLoading(false);
      }
    })();
  }, [user, staffId]);
  /* ------- Auto-select guarantors from existing cart rows ------- */
  useEffect(() => {
    // wait until both cart and guarantor options are loaded
    if (items.length === 0) return;
    if (guarantorOptionsLoading) return;

    // take guarantor ids from the first cart row that has them set
    const first = items.find((i) => i.guarantor_1 || i.guarantor_2);
    if (!first) return;

    const g1 = first.guarantor_1 ? String(first.guarantor_1) : "";
    const g2 = first.guarantor_2 ? String(first.guarantor_2) : "";

    // Only set if the id actually exists in the guarantor list
    const has = (id: string) =>
      !!id && guarantorOptions.some((o) => String(o.value) === id);

    if (g1 && has(g1) && !guarantor1Id) setGuarantor1Id(g1);
    if (g2 && has(g2) && !guarantor2Id) setGuarantor2Id(g2);
  }, [items, guarantorOptions, guarantorOptionsLoading]);

  /* ------------------------------ derived ---------------------------------- */

  const summary = useMemo(() => {
    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = items.reduce(
      (s, i) => s + parseFloat(String(i.total_amount)) || 0,
      0,
    );
    const totalWeight = items.reduce((s, i) => {
      const w = parseFloat(String(i.product_weight ?? 0)) || 0;
      return s + w * i.quantity;
    }, 0);
    const courierCharge = items.reduce((s, i) => {
      const c = parseFloat(String(i.courier_fee ?? 0)) || 0;
      return s + c * i.quantity;
    }, 0);
    const documentFee = calculateDocumentFee(totalAmount);
    const fullLoan = totalAmount + courierCharge;
    const monthPayment = fullLoan / PERIOD_MONTHS;

    return {
      totalItems,
      totalAmount,
      totalWeight,
      courierCharge,
      documentFee,
      fullLoan,
      monthPayment,
    };
  }, [items]);

  const canSubmit =
    items.length > 0 &&
    !!nic.trim() &&
    !!address.trim() &&
    !!phone1.trim() &&
    !!guarantor1Id &&
    !!agreementFront &&
    !!agreementBack &&
    guarantor1Id !== guarantor2Id;

  /* ------------------------------ remove item ------------------------------ */

  const removeItem = async (itemId: number | string) => {
    if (!confirm("Remove this item from your staff cart?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/staff/cart/${encodeURIComponent(
          String(staffId),
        )}/${encodeURIComponent(String(itemId))}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to remove item");
      }
      setItems((prev) => prev.filter((i) => String(i.id) !== String(itemId)));
    } catch (err: any) {
      setFormError(err.message || "Failed to remove item");
      setTimeout(() => setFormError(null), 5000);
    }
  };

  /* --------------------------------- submit -------------------------------- */

  const handleSubmit = async () => {
    setFormError(null);

    if (!canSubmit) {
      setFormError(
        "Please fill all required fields and attach both documents.",
      );
      return;
    }
    if (guarantor1Id && guarantor2Id && guarantor1Id === guarantor2Id) {
      setFormError("Guarantor 1 and Guarantor 2 must be different.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      // ---- staff identity / profile ----
      formData.append("staff_user_id", String(staffId));
      formData.append("staff_name", staffName);
      formData.append("bname", staffBname); // ✅ NEW
      formData.append("customer_nic", nic.trim().toUpperCase());
      formData.append("customer_name", staffName);
      formData.append("customer_address", address.trim());
      formData.append("customer_phone", phone1.trim());
      formData.append("customer_phone2", phone2.trim());

      // ---- cart ----
      formData.append(
        "product_ids",
        JSON.stringify(items.map((i) => String(i.id))), // ✅ cart row ids (strings)
      );
      formData.append(
        "product_codes",
        JSON.stringify(items.map((i) => i.product_code)), // ✅ NEW — products.product_id codes
      );

      // ---- money ----
      formData.append("total_amount", String(summary.totalAmount));
      formData.append("courier_charge", String(summary.courierCharge));
      formData.append("document_fee", String(summary.documentFee));
      formData.append("period_months", String(PERIOD_MONTHS));
      formData.append("month_payment", String(summary.monthPayment));
      formData.append("full_loan", String(summary.fullLoan));

      // ---- guarantors ----
      formData.append("guarantor_1_id", guarantor1Id);
      formData.append("guarantor_2_id", guarantor2Id || "");
      // also send names for persistence convenience
      formData.append(
        "guarantor_1_name",
        guarantorOptions.find((o) => o.value === guarantor1Id)?.label || "",
      );
      formData.append(
        "guarantor_2_name",
        guarantorOptions.find((o) => o.value === guarantor2Id)?.label || "",
      );

      // ---- documents ----
      // ---- documents (compress to <1 MB each before upload) ----
      if (agreementFront) {
        const compressedFront = await compressImage(agreementFront, {
          maxSizeMB: 0.9, // under 1 MB → leaves room for the 2nd photo
          maxWidthOrHeight: 1600,
          initialQuality: 0.85,
        });
        formData.append("purchase_agreement", compressedFront);
      }
      if (agreementBack) {
        const compressedBack = await compressImage(agreementBack, {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1600,
          initialQuality: 0.85,
        });
        formData.append("purchase_agreement_back", compressedBack);
      }

      const res = await fetch(`${API_BASE_URL}/staff/loans/submit`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit loan");
      }

      setSuccessMessage("✅ Staff product loan submitted successfully!");
      setSuccessDetails(data.data);
      setItems([]);
      setTimeout(() => {
        setSuccessMessage(null);
        setSuccessDetails(null);
      }, 12000);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit loan");
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------- render -------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-80 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6 mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-orange-500" />
              Buy for Myself
            </h1>
            <p className="text-sm text-gray-500">
              Review your staff cart and submit a monthly product loan (
              {PERIOD_MONTHS} months)
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

        {/* Success */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{successMessage}</p>
                {successDetails && (
                  <div className="text-sm text-green-700 mt-2 space-y-0.5">
                    <p>
                      <span className="font-medium">Loan Code:</span>{" "}
                      {successDetails.loan_code}
                    </p>
                    <p>
                      <span className="font-medium">Monthly Payment:</span> Rs.{" "}
                      {Number(successDetails.week_payment || 0).toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Full Loan:</span> Rs.{" "}
                      {Number(successDetails.full_loan || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Errors */}
        {(error || formError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{formError || error}</p>
            </div>
            <button
              onClick={() => {
                setFormError(null);
                setError(null);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Your staff cart is empty
            </h3>
            <p className="text-gray-500 mt-1">
              Browse the staff store to add products
            </p>
            <Button
              onClick={() => navigate("/dashboard/staff-store")}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Browse Staff Store
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                label="Items"
                value={String(summary.totalItems)}
                icon={<Package className="w-5 h-5 text-orange-600" />}
                tint="bg-orange-50"
              />
              <SummaryCard
                label="Total Amount"
                value={`Rs. ${summary.totalAmount.toFixed(2)}`}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                tint="bg-green-50"
              />
              <SummaryCard
                label={`Monthly (${PERIOD_MONTHS} mo)`}
                value={`Rs. ${summary.monthPayment.toFixed(2)}`}
                icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
                tint="bg-blue-50"
              />
              <SummaryCard
                label="Document Fee"
                value={`Rs. ${summary.documentFee.toFixed(2)}`}
                icon={<CreditCard className="w-5 h-5 text-purple-600" />}
                tint="bg-purple-50"
              />
            </div>

            {/* Cart items */}
            <Card className="bg-white mb-6">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  Cart Items ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const price = parseFloat(String(item.price)) || 0;
                    const total = parseFloat(String(item.total_amount)) || 0;
                    const key = String(item.id);
                    const isExpanded = expanded.has(key);
                    const img = item.images?.[0];

                    return (
                      <div
                        key={key}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={() => {
                            const s = new Set(expanded);
                            s.has(key) ? s.delete(key) : s.add(key);
                            setExpanded(s);
                          }}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={item.product_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {item.product_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                  <span className="font-mono">
                                    {item.product_code}
                                  </span>
                                  <span>×</span>
                                  <span>{item.quantity}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">
                                  Rs. {total.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Rs. {price.toFixed(2)} each
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeItem(item.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 grid grid-cols-2 gap-3 text-xs text-gray-600 bg-gray-50">
                              <div>
                                <p className="text-gray-400">Guarantor 1</p>
                                <p className="font-medium">
                                  {item.guarantor_1 || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">Guarantor 2</p>
                                <p className="font-medium">
                                  {item.guarantor_2 || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">Status</p>
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {item.status}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-gray-400">Added</p>
                                <p className="font-medium">
                                  {new Date(item.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Submission form */}
            <Card className="bg-white">
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Loan Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      Your details will be attached to this product loan.
                    </p>
                  </div>
                  {profileLoading && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading profile…
                    </span>
                  )}
                </div>

                {/* Staff details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Full Name"
                    icon={<User className="w-4 h-4 text-gray-400" />}
                  >
                    <Input value={staffName} disabled className="bg-gray-50" />
                  </Field>

                  <Field
                    label="Branch"
                    icon={<MapPin className="w-4 h-4 text-gray-400" />}
                  >
                    <Input
                      value={staffBname || "—"}
                      disabled
                      className="bg-gray-50"
                    />
                  </Field>

                  <Field
                    label="NIC"
                    required
                    icon={<CreditCard className="w-4 h-4 text-gray-400" />}
                  >
                    <Input
                      value={nic}
                      onChange={(e) => setNic(e.target.value.toUpperCase())}
                      placeholder="123456789V / 123456789012"
                      disabled={submitting || profileLoading}
                    />
                  </Field>

                  <Field
                    label="Address"
                    required
                    icon={<MapPin className="w-4 h-4 text-gray-400" />}
                    className="md:col-span-2"
                  >
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="No 123, Street, City"
                      disabled={submitting || profileLoading}
                    />
                  </Field>

                  <Field
                    label="Phone 1"
                    required
                    icon={<Phone className="w-4 h-4 text-gray-400" />}
                  >
                    <Input
                      value={phone1}
                      onChange={(e) => setPhone1(e.target.value)}
                      placeholder="07X XXX XXXX"
                      disabled={submitting || profileLoading}
                    />
                  </Field>

                  <Field
                    label="Phone 2 (optional)"
                    icon={<Phone className="w-4 h-4 text-gray-400" />}
                  >
                    <Input
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder="Optional"
                      disabled={submitting || profileLoading}
                    />
                  </Field>
                </div>

                {/* Guarantors */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-orange-500" />
                    Guarantors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Guarantor 1 <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1">
                        <SearchableSelect
                          options={guarantorOptions.filter(
                            (o) => o.value !== guarantor2Id,
                          )}
                          value={guarantor1Id}
                          onChange={(v) => setGuarantor1Id(v)}
                          placeholder={
                            guarantorOptionsLoading
                              ? "Loading…"
                              : "Search Guarantor 1"
                          }
                          disabled={submitting || guarantorOptionsLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Guarantor 2 (optional)
                      </Label>
                      <div className="mt-1">
                        <SearchableSelect
                          options={guarantorOptions.filter(
                            (o) => o.value !== guarantor1Id,
                          )}
                          value={guarantor2Id}
                          onChange={(v) => setGuarantor2Id(v)}
                          placeholder={
                            guarantorOptionsLoading
                              ? "Loading…"
                              : "Search Guarantor 2"
                          }
                          disabled={submitting || guarantorOptionsLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <FileImage className="w-4 h-4 text-orange-500" />
                    Purchase Agreement Photos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DocumentUpload
                      label="Front side"
                      file={agreementFront}
                      onChange={setAgreementFront}
                      disabled={submitting}
                      required
                    />
                    <DocumentUpload
                      label="Back side"
                      file={agreementBack}
                      onChange={setAgreementBack}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                {/* Summary + submit */}
                <div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                    <Row
                      label="Total amount"
                      value={`Rs. ${summary.totalAmount.toFixed(2)}`}
                    />
                    <Row
                      label="Courier charge"
                      value={`Rs. ${summary.courierCharge.toFixed(2)}`}
                    />
                    <Row
                      label="Document fee"
                      value={`Rs. ${summary.documentFee.toFixed(2)}`}
                    />
                    <Row
                      label="Full loan"
                      value={`Rs. ${summary.fullLoan.toFixed(2)}`}
                      bold
                    />
                    <Row
                      label={`Monthly × ${PERIOD_MONTHS}`}
                      value={`Rs. ${summary.monthPayment.toFixed(2)}`}
                      bold
                      accent
                    />
                  </div>

                  <div className="flex flex-col justify-end gap-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !canSubmit}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base font-semibold disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Submit Staff Product Loan
                        </>
                      )}
                    </Button>
                    {!canSubmit && !submitting && (
                      <p className="text-xs text-amber-600 text-center">
                        Fill all required fields and attach both document photos
                        to enable submission.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

/* ------------------------------ helper UI -------------------------------- */

const SummaryCard = ({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
}) => (
  <Card className="bg-white">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
      </div>
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${tint}`}
      >
        {icon}
      </div>
    </CardContent>
  </Card>
);

const Field = ({
  label,
  icon,
  required,
  className = "",
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={className}>
    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
      {icon}
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="mt-1">{children}</div>
  </div>
);

const Row = ({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) => (
  <div className="flex justify-between">
    <span className={bold ? "font-semibold text-gray-700" : "text-gray-600"}>
      {label}
    </span>
    <span
      className={
        accent
          ? "font-bold text-orange-600"
          : bold
            ? "font-bold text-gray-900"
            : "text-gray-900"
      }
    >
      {value}
    </span>
  </div>
);

const DocumentUpload = ({
  label,
  file,
  onChange,
  disabled,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
  required?: boolean;
}) => (
  <div>
    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1">
      <FileImage className="w-4 h-4 text-gray-400" />
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <label
      className={`flex items-center justify-center gap-2 h-24 w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm ${
        file
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-500"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        disabled={disabled}
      />
      {file ? (
        <>
          <CheckCircle className="w-5 h-5" />
          <span className="truncate max-w-[80%]">{file.name}</span>
        </>
      ) : (
        <>
          <Upload className="w-5 h-5" />
          <span>Click to upload</span>
        </>
      )}
    </label>
  </div>
);

export default BuyForMyself;
