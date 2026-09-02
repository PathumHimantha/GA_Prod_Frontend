import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  User,
  CreditCard,
  Phone,
  MapPin,
  Hash,
  Building2,
  Calendar,
  ImageIcon,
  X,
  Shield,
  Home,
  Globe,
  Banknote,
  Percent,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { API, API_BASE_URL } from "@/apiConfig";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import Guarantor from "./Guarantor";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { BANKS } from "@/lib/bank";
// ─────────────────────────────────────────────────────────────
// FILE UPLOAD FIELD (with preview for existing files)
// ─────────────────────────────────────────────────────────────
interface FileUploadFieldProps {
  id: string;
  label: string;
  required?: boolean;
  existing?: string | null;
  onFile?: (file: File | null) => void;
}

const FileUploadField = ({
  id,
  label,
  required = false,
  existing,
  onFile,
}: FileUploadFieldProps) => {
  const [fileName, setFileName] = useState("No file chosen");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (filename: string) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  };

  React.useEffect(() => {
    if (existing && isImageFile(existing)) {
      setFileName(existing.split("/").pop() || existing);
      setPreview(existing);
    } else if (existing) {
      setFileName(existing.split("/").pop() || existing);
    }
  }, [existing]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0] || null;
    if (!raw) {
      setFileName("No file chosen");
      setPreview(null);
      onFile?.(null);
      return;
    }

    const file = await compressImage(raw, { maxSizeBytes: 900_000 });
    setFileName(
      file !== raw
        ? `${file.name}  (${formatBytes(raw.size)} → ${formatBytes(file.size)})`
        : file.name,
    );

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    onFile?.(file);
  };

  const clearFile = () => {
    setFileName("No file chosen");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onFile?.(null);
  };

  const hasExisting = !preview && existing;

  const openFile = () => {
    if (preview) {
      window.open(preview, "_blank");
    } else if (existing) {
      window.open(existing, "_blank");
    }
  };

  return (
    <div className="group relative rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div
          className="relative flex-shrink-0 cursor-pointer"
          onClick={openFile}
          title="Click to view"
        >
          {preview ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shadow-sm">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
          ) : hasExisting ? (
            <div
              className="w-16 h-16 rounded-lg border border-green-200 bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
              onClick={openFile}
            >
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          ) : (
            <label
              htmlFor={id}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-input bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <Upload
                size={18}
                className="text-muted-foreground group-hover:text-primary transition-colors"
              />
            </label>
          )}
          {preview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            >
              <X size={10} />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {fileName !== "No file chosen"
              ? fileName
              : hasExisting
                ? "Previous file on record"
                : "JPG, PNG or PDF accepted"}
          </p>
          {hasExisting && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              Existing file kept
            </span>
          )}
          <div className="flex items-center gap-2 mt-2">
            {hasExisting && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={openFile}
              >
                View
              </Button>
            )}
            {!preview && (
              <label
                htmlFor={id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
              >
                <Upload size={12} />
                {hasExisting ? "Replace" : "Browse"}
              </label>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        id={id}
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LOCKED FIELD (readonly display for center/group/branch)
// ─────────────────────────────────────────────────────────────
const LockedField = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: any;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-gray-700">{label}</Label>
    <div className="flex items-center gap-2 h-12 px-3 bg-gray-50 border border-gray-200 rounded-md">
      {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
      <span className="text-sm text-gray-600 font-medium">{value || "—"}</span>
      <Badge variant="outline" className="ml-auto text-xs text-gray-400">
        Locked
      </Badge>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
// Change the component signature
const RenewLoan = ({
  isBusiness = false,
  isDaily = false,
  canSubmitLoan = true, // ✅ add
  checkingFloat = false, // ✅ add
}: {
  isBusiness?: boolean;
  isDaily?: boolean;
  canSubmitLoan?: boolean; // ✅ add
  checkingFloat?: boolean; // ✅ add
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toISOString().split("T")[0];

  // ── Search ────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [customer, setCustomer] = useState<any>(null);

  // ── Tab ───────────────────────────────────────────────────
  const [tab, setTab] = useState<"loan" | "guarantor">("loan");

  // ── Editable loan fields ──────────────────────────────────
  const [cname, setCname] = useState("");
  const [address, setAddress] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [phone1Error, setPhone1Error] = useState("");
  const [phone2Error, setPhone2Error] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanCat, setLoanCat] = useState(
    isBusiness ? "Business Loan" : isDaily ? "Daily Loan" : "Consumer Loan",
  );
  const [loanDate, setLoanDate] = useState(dateStr);
  const [period, setPeriod] = useState("13");
  const [interest, setInterest] = useState("30");
  const [docFee, setDocFee] = useState("0");
  const [insFee, setInsFee] = useState("0");

  // ── Bank Account Fields ──────────────────────────────────
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"Current" | "Saving">(
    "Saving",
  );
  const [accountNo, setAccountNo] = useState("");
  const [confirmAccountNo, setConfirmAccountNo] = useState("");
  const [accountNoError, setAccountNoError] = useState("");

  // ── Guarantor ─────────────────────────────────────────────
  const [gName, setGName] = useState("");
  const [gNic, setGNic] = useState("");
  const [gAddress, setGAddress] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gPhoneErr, setGPhoneErr] = useState("");

  // ── Files ─────────────────────────────────────────────────
  const files = useRef<Record<string, File | null>>({});
  const setFile = (key: string) => (f: File | null) => {
    files.current[key] = f;
  };
  const [businessType, setBusinessType] = useState("");
  // ── Submit state ──────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);
  const [submitError, setSubmitError] = useState("");

  const getDocumentUrl = (type: "image" | "document", path: string | null) => {
    if (!path || !customer) return null;
    if (type === "image") {
      return `${API_BASE_URL}/api/loan/customer-images/${path}`;
    }
    if (type === "document") {
      const date = customer.loan_date?.replace(/-/g, "");
      const memberNumber = customer.customer_code?.trim().split("/").pop();
      return `${API_BASE_URL}/api/customers/documents/file/${customer.bcode}/${customer.ccode}/${customer.group}/${memberNumber}/${date}/${path}`;
    }
    return null;
  };

  // ── Phone handlers ────────────────────────────────────────
  const handlePhone1 = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 10);
    setPhone1(d);
    setPhone1Error(d.length > 0 && d.length !== 10 ? "Must be 10 digits" : "");
  };
  const handlePhone2 = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 10);
    setPhone2(d);
    setPhone2Error("");
  };
  const handleGPhone = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 10);
    setGPhone(d);
    setGPhoneErr(d.length > 0 && d.length !== 10 ? "Must be 10 digits" : "");
  };

  // ── Account number handlers ──────────────────────────────
  const handleAccountNoChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setAccountNo(digits);
    if (confirmAccountNo && digits !== confirmAccountNo) {
      setAccountNoError("Account numbers do not match");
    } else if (confirmAccountNo && digits === confirmAccountNo) {
      setAccountNoError("");
    }
  };

  const handleConfirmAccountNoChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setConfirmAccountNo(digits);
    if (accountNo && digits !== accountNo) {
      setAccountNoError("Account numbers do not match");
    } else if (accountNo && digits === accountNo) {
      setAccountNoError("");
    }
  };

  // ── Helper to get next payment date ───────────────────────
  const getNextPaymentDate = () => {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + 7);
    return nextDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ── Check if customer has outstanding balance ─────────────
  const hasOutstandingBalance = customer && Number(customer.loan_balance) > 0;

  // ── Search customer ───────────────────────────────────────
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchError("");
    setCustomer(null);
    try {
      const res = await fetch(
        API.loan.getCustomerByLoan(searchTerm.trim(), user?.bcode || ""),
      );
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || "Customer not found");
        return;
      }

      const c = data.customer;
      setCustomer(c);

      // Pre-fill editable fields
      setBusinessType(c.business_type || "");
      setCname(c.cname || "");
      setAddress(c.address || "");
      setPhone1(c.phone1 || "");
      setPhone2(c.phone2 || "");
      setGName(c.guarantor_name || "");
      setGNic(c.guarantor_nic || "");
      setGAddress(c.guarantor_address || "");
      setGPhone(c.guarantor_phone || "");
      setLoanAmount(String(c.loan_amount || ""));
      setInterest(String(parseFloat(c.interest || "0.03") * 100));
      setLoanCat(
        isBusiness
          ? "Business Loan"
          : isDaily
            ? "Daily Loan"
            : c.loan_category || "Consumer Loan",
      );
      // ── Pre-fill bank account details for business loans ──
      if ((isBusiness || isDaily) && c.bank_account) {
        setBankName(c.bank_account.bank || "");
        setAccountType(
          c.bank_account.account_type === "Current" ? "Current" : "Saving",
        );
        setAccountNo(c.bank_account.account_no || "");
        setConfirmAccountNo(c.bank_account.account_no || "");
      } else {
        // Reset bank fields if not business or no bank account
        setBankName("");
        setAccountType("Saving");
        setAccountNo("");
        setConfirmAccountNo("");
      }
    } catch {
      setSearchError("Cannot connect to server.");
    } finally {
      setSearching(false);
    }
  };

  // Special center overrides based on searched customer's ccode
  useEffect(() => {
    if (!customer) return;

    const SPECIAL_CCODES = ["023", "024", "013"];

    if (customer.bcode === "G01" && SPECIAL_CCODES.includes(customer.ccode)) {
      setPeriod("12");
      setInterest("20");
    } else {
      setPeriod("13");
      setInterest(String(parseFloat(customer.interest || "0.30") * 100));
    }
  }, [customer]);

  // ── Loan summary preview ──────────────────────────────────
  const calcSummary = () => {
    const a = parseFloat(loanAmount) || 0;
    const p = parseInt(period) || 0;
    const r = parseFloat(interest) / 100 || 0;

    if (!a || !p || !r) return null;

    const totalInt = a * r;
    const full_loan = a + totalInt;

    return {
      full_loan,
      week_payment: Math.ceil(full_loan / p),
      totalInt,
      nextPaymentDate: getNextPaymentDate(),
    };
  };

  const summary = calcSummary();

  // ── Submit renew ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    // Validate bank account for business loans
    if (isBusiness || isDaily) {
      if (!bankName) {
        setSubmitError("Please select a bank");
        return;
      }
      if (!accountType) {
        setSubmitError("Please select account type");
        return;
      }
      if (!accountNo || accountNo.length < 5) {
        setSubmitError("Please enter a valid account number");
        return;
      }
      if (accountNo !== confirmAccountNo) {
        setSubmitError("Account numbers do not match");
        return;
      }
    }

    const loanAmountNum = parseFloat(loanAmount) || 0;
    const calculatedDocFee = (loanAmountNum * 0.01).toFixed(2);
    const calculatedInsFee = (loanAmountNum * 0.01).toFixed(2);

    const requiredFiles =
      loanCat === "Business Loan" || loanCat === "Daily Loan"
        ? [
            { key: "application_form", label: "Application Form 1" },
            { key: "application_form_2", label: "Application Form 2" },
            { key: "loan_agreement", label: "Loan Agreement 1" },
            { key: "loan_agreement_2", label: "Loan Agreement 2" },
            { key: "promissory_note", label: "Promissory Note" },
            // Budget Report: Required for Business ALWAYS, Daily only if amount >= 30000
            ...(isBusiness ||
            (isDaily && parseFloat(loanAmount || "0") >= 30000)
              ? [{ key: "budget_report", label: "Budget Report" }]
              : []),
            { key: "bank_passbook", label: "Bank Passbook" },
          ]
        : requiresExtraDocs
          ? [
              { key: "application_form", label: "Application Form 1" },
              // { key: "application_form_2", label: "Application Form 2" },
              { key: "loan_agreement", label: "Loan Agreement 1" },
              { key: "loan_agreement_2", label: "Loan Agreement 2" },
              { key: "promissory_note", label: "Promissory Note" },
            ]
          : [
              { key: "application_form", label: "Application Form 1" },
              // { key: "application_form_2", label: "Application Form 2" },
              { key: "loan_agreement", label: "Loan Agreement 1" },
              { key: "loan_agreement_2", label: "Loan Agreement 2" },
              { key: "promissory_note", label: "Promissory Note" },
            ];

    const missingFiles = requiredFiles.filter((f) => !files.current[f.key]);
    if (missingFiles.length > 0) {
      setSubmitError(
        `Please upload required documents: ${missingFiles.map((f) => f.label).join(", ")}`,
      );
      return;
    }

    const fd = new FormData();
    fd.append("original_id", String(customer.id));
    fd.append("bname", customer.bname || "");
    fd.append("bcode", customer.bcode || "");
    fd.append("center", customer.center || "");
    fd.append("ccode", customer.ccode || "");
    fd.append("group", customer.group || "");
    fd.append("cname", cname);
    fd.append("name", user.name);
    fd.append("nic", customer.nic);
    fd.append("address", address);
    fd.append("phone1", phone1);
    fd.append("phone2", phone2);
    fd.append("loan_amount", loanAmount);
    fd.append("loan_category", loanCat);
    fd.append("period", period);
    fd.append("interest", interest);
    fd.append("loan_date", loanDate);
    fd.append("document_fee", calculatedDocFee);
    fd.append("insurance_fee", calculatedInsFee);
    fd.append("guarantor_name", gName);
    fd.append("guarantor_nic", gNic);
    fd.append("guarantor_address", gAddress);
    fd.append("guarantor_phone", gPhone);

    // ── Append bank details for business loans ──
    if (isBusiness || isDaily) {
      fd.append("bank", bankName);
      fd.append("account_type", accountType);
      fd.append("account_no", accountNo);
    }

    if (isBusiness) {
      fd.append("business_type", businessType);
    }

    Object.entries(files.current).forEach(([key, file]) => {
      if (file) fd.append(key, file);
    });

    try {
      const res = await fetch(
        isDaily ? API.dailyloan.renewDaily : API.loan.renewConsumerLoan,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to renew");
        return;
      }
      setSubmitSuccess(data);
      setTimeout(() => {
        navigate(`/dashboard/loan-success?loan_code=${data.loan_code}`);
      }, 1500);
      setTimeout(() => setSubmitSuccess(null), 6000);
    } catch {
      setSubmitError("Cannot connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCustomer(null);
    setSearchTerm("");
    setSearchError("");
    setCname("");
    setAddress("");
    setPhone1("");
    setPhone2("");
    setGName("");
    setGNic("");
    setGAddress("");
    setGPhone("");
    setLoanAmount("");
    setBusinessType("");
    setBankName("");
    setAccountType("Saving");
    setAccountNo("");
    setConfirmAccountNo("");
    setAccountNoError("");
    setSubmitError("");
    setSubmitSuccess(null);
    files.current = {};
  };

  const BUSINESS_TYPES = [
    "Food Corner",
    "Grocery Shop",
    "Saloon / Beauty Parlour",
    "Juice Bar",
    "Bakery",
    "Pharmacy / Medical Shop",
    "Hardware Store",
    "Clothing Shop",
    "Mobile / Electronics Shop",
    "Restaurant / Hotel",
    "Vegetable / Fruit Stall",
    "Stationery Shop",
    "Tailor Shop",
    "Spare Parts Shop",
    "Other Business",
  ];

  const FEATURES = {
    HIGH_AMOUNT_CONSUMER_DOCS: true, // Set to true when management approves
  };
  const requiresExtraDocs =
    FEATURES.HIGH_AMOUNT_CONSUMER_DOCS &&
    loanCat === "Consumer Loan" &&
    (parseFloat(loanAmount) >= 25000 ||
      (!loanAmount && customer && Number(customer.loan_amount) >= 25000));
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-xl shadow-sm border border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {user?.bname}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-xl shadow-sm border border-border">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{dateStr}</span>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
            {dayName}
          </span>
        </div>
      </div>

      {/* ── Search Card ── */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                Find Customer
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Search by NIC number or customer code
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5 max-w-sm">
              <Label className="text-sm font-medium text-foreground">
                NIC / Customer Code
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter NIC or customer code..."
                  className="pl-9 h-12 bg-background border-border"
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="h-12 px-6 gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </Button>
            {customer && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-12 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </Button>
            )}
          </div>

          {searchError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <XCircle className="w-4 h-4 shrink-0" />
              {searchError}
            </div>
          )}

          {/* ── Previous loan summary pills ── */}
          {customer && (
            <div className="mt-5 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Previous Loan Record
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Customer", value: customer.cname },
                  { label: "Code", value: customer.customer_code },
                  { label: "Last Loan", value: customer.loan_date },
                  {
                    label: "Balance",
                    value: `Rs. ${Number(customer.loan_balance || 0).toLocaleString()}`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-white rounded-lg p-2 text-center border border-primary/10"
                  >
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {hasOutstandingBalance && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  This customer has an outstanding balance. Renewal has been
                  blocked.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Renew Form (only shown after customer found) ── */}
      {customer && (
        <>
          {/* Success */}
          {submitSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">
                  Loan renewed successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Loan Code:{" "}
                  <span className="font-mono font-bold">
                    {submitSuccess.loan_code}
                  </span>
                  &nbsp;·&nbsp; Weekly:{" "}
                  <span className="font-bold">
                    Rs. {submitSuccess.summary?.week_payment?.toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          )}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* ── Tabs ── */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "loan" | "guarantor")}
            className="w-full"
          >
            <TabsList className="w-full sm:w-auto gap-1 bg-muted p-1 rounded-xl">
              <TabsTrigger
                value="loan"
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText size={16} />
                Loan Details
              </TabsTrigger>
              <TabsTrigger
                value="guarantor"
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <Shield size={16} />
                Guarantor Details
              </TabsTrigger>
            </TabsList>

            {/* ══════════ LOAN TAB ══════════ */}
            <TabsContent value="loan" className="mt-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        Renew Loan Application
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Center, group and NIC are locked from the previous loan
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* ── Locked: Branch / Center / Group ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Center Information
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-400 ml-2"
                        >
                          Read-only
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <LockedField
                          label="Branch"
                          value={customer.bname}
                          icon={Building2}
                        />
                        <LockedField
                          label="Center"
                          value={customer.center}
                          icon={MapPin}
                        />
                        <LockedField
                          label="Group"
                          value={customer.group}
                          icon={Hash}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <LockedField
                          label="NIC"
                          value={customer.nic}
                          icon={CreditCard}
                        />
                        <LockedField
                          label="Customer Code"
                          value={customer.customer_code}
                          icon={Hash}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* ── Editable: Customer Info ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Customer Information
                        <Badge className="text-xs bg-green-100 text-green-700 ml-2">
                          Editable
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">
                            Customer Name{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              value={cname}
                              onChange={(e) => setCname(e.target.value)}
                              placeholder="Customer full name"
                              className="pl-9 h-12 bg-background border-border"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">
                            Address <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Full address"
                              className="pl-9 h-12 bg-background border-border"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">
                            Mobile Number{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              type="tel"
                              value={phone1}
                              onChange={(e) => handlePhone1(e.target.value)}
                              placeholder="0712345678"
                              className={`pl-9 h-12 bg-background border-border ${phone1Error ? "border-destructive" : ""}`}
                              maxLength={10}
                              required
                            />
                          </div>
                          {phone1Error && (
                            <p className="text-xs text-destructive">
                              {phone1Error}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {phone1.length}/10 digits
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">
                            Mobile Number 2
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              type="tel"
                              value={phone2}
                              onChange={(e) => handlePhone2(e.target.value)}
                              placeholder="0712345678 (optional)"
                              className={`pl-9 h-12 bg-background border-border ${phone2Error ? "border-destructive" : ""}`}
                              maxLength={10}
                            />
                          </div>
                          {phone2Error && (
                            <p className="text-xs text-destructive">
                              {phone2Error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* ── Customer Photo ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-primary" />
                        Customer Photo
                      </h3>
                      <FileUploadField
                        id="image"
                        label="Image of Customer"
                        existing={
                          customer.image
                            ? getDocumentUrl("image", customer.image)
                            : null
                        }
                        onFile={setFile("image")}
                      />
                    </div>

                    <Separator />

                    {/* ── Documents ── */}
                    <div className="space-y-5">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Document Uploads
                      </h3>

                      {loanCat === "Business Loan" ||
                      loanCat === "Daily Loan" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FileUploadField
                            id="application_form"
                            label="Application Form 1"
                            required
                            onFile={setFile("application_form")}
                          />
                          <FileUploadField
                            id="application_form_2"
                            label="Application Form 2"
                            required
                            onFile={setFile("application_form_2")}
                          />
                          <FileUploadField
                            id="loan_agreement"
                            label="Loan Agreement 1"
                            required
                            onFile={setFile("loan_agreement")}
                          />
                          <FileUploadField
                            id="loan_agreement_2"
                            label="Loan Agreement 2"
                            onFile={setFile("loan_agreement_2")}
                          />
                          <FileUploadField
                            id="promissory_note"
                            label="Promissory Note"
                            required
                            onFile={setFile("promissory_note")}
                          />
                          {(isBusiness ||
                            (isDaily &&
                              parseFloat(loanAmount || "0") >= 30000)) && (
                            <FileUploadField
                              id="budget_report"
                              label="Budget Report"
                              required
                              onFile={setFile("budget_report")}
                            />
                          )}
                          <FileUploadField
                            id="bank_passbook"
                            label="Bank Passbook"
                            required
                            onFile={setFile("bank_passbook")}
                          />
                        </div>
                      ) : requiresExtraDocs ? (
                        <>
                          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-700 font-medium">
                              Loan amount Rs.{" "}
                              {Number(loanAmount).toLocaleString()} requires
                              additional documents
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FileUploadField
                              id="application_form"
                              label="Application Form 1"
                              required
                              onFile={setFile("application_form")}
                            />
                            <FileUploadField
                              id="application_form_2"
                              label="Application Form 2"
                              required
                              onFile={setFile("application_form_2")}
                            />
                            <FileUploadField
                              id="loan_agreement"
                              label="Loan Agreement 1"
                              required
                              onFile={setFile("loan_agreement")}
                            />
                            <FileUploadField
                              id="loan_agreement_2"
                              label="Loan Agreement 2"
                              required
                              onFile={setFile("loan_agreement_2")}
                            />
                            <FileUploadField
                              id="promissory_note"
                              label="Promissory Note"
                              required
                              onFile={setFile("promissory_note")}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FileUploadField
                            id="application_form"
                            label="Application Form 1"
                            required
                            onFile={setFile("application_form")}
                          />
                          <FileUploadField
                            id="application_form_2"
                            label="Application Form 2"
                            required
                            onFile={setFile("application_form_2")}
                          />
                          <FileUploadField
                            id="loan_agreement"
                            label="Loan Agreement 1"
                            required
                            onFile={setFile("loan_agreement")}
                          />
                          <FileUploadField
                            id="loan_agreement_2"
                            label="Loan Agreement 2"
                            required
                            onFile={setFile("loan_agreement_2")}
                          />
                          <FileUploadField
                            id="promissory_note"
                            label="Promissory Note"
                            required
                            onFile={setFile("promissory_note")}
                          />
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* ── Bank Account Details (Business Only) ── */}
                    {(isBusiness || isDaily) && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-primary" />
                            Bank Account Details
                            {customer.bank_account ? (
                              <Badge className="text-xs bg-green-100 text-green-700 ml-2">
                                Existing
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-amber-100 text-amber-700 ml-2">
                                Add New
                              </Badge>
                            )}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-foreground">
                                Bank <span className="text-destructive">*</span>
                              </Label>
                              <SearchableSelect
                                options={BANKS}
                                value={bankName}
                                onChange={setBankName}
                                placeholder="Select Bank"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-foreground">
                                Account Type{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <div className="flex gap-4 h-12 items-center">
                                <Button
                                  type="button"
                                  variant={
                                    accountType === "Current"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => setAccountType("Current")}
                                  className="flex-1 h-12"
                                >
                                  Current
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    accountType === "Saving"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => setAccountType("Saving")}
                                  className="flex-1 h-12"
                                >
                                  Saving
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-foreground">
                                Account No{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                  value={accountNo}
                                  onChange={(e) =>
                                    handleAccountNoChange(e.target.value)
                                  }
                                  placeholder="Enter account number"
                                  className="pl-9 h-12 bg-background border-border"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-foreground">
                                Confirm Account No{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                  value={confirmAccountNo}
                                  onChange={(e) =>
                                    handleConfirmAccountNoChange(e.target.value)
                                  }
                                  placeholder="Re-enter account number"
                                  className={`pl-9 h-12 bg-background border-border ${accountNoError ? "border-destructive" : ""}`}
                                  required
                                />
                              </div>
                              {accountNoError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {accountNoError}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* ── Loan Info ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-primary" />
                        Loan Information
                        <Badge className="text-xs bg-green-100 text-green-700 ml-2">
                          Editable
                        </Badge>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">
                            Loan Amount{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              type="number"
                              value={loanAmount}
                              onChange={(e) => setLoanAmount(e.target.value)}
                              placeholder="Enter loan amount"
                              className="pl-9 h-12 bg-background border-border"
                              required
                              min={isBusiness || isDaily ? 15000 : 15000}
                              max={isBusiness || isDaily ? 1000000 : 30000}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isBusiness || isDaily
                              ? "Min: 15,000 — Max: 1,000,000"
                              : "Min: 15,000 — Max: 30,000"}
                          </p>
                        </div>
                        {isBusiness && (
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">
                              Business Type{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={businessType}
                              onValueChange={setBusinessType}
                            >
                              <SelectTrigger className="h-12 bg-background border-border">
                                <SelectValue placeholder="Select business type" />
                              </SelectTrigger>
                              <SelectContent>
                                {BUSINESS_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Loan summary */}
                      {summary && (
                        <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                            Renewal Summary
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                              {
                                label: "Next Payment Date",
                                value: summary.nextPaymentDate,
                                icon: CalendarDays,
                              },
                              {
                                label: "Full Loan",
                                value: `Rs. ${summary.full_loan.toLocaleString()}`,
                                icon: Banknote,
                              },
                              {
                                label: "Weekly Payment",
                                value: `Rs. ${summary.week_payment.toLocaleString()}`,
                                icon: Clock,
                              },
                            ].map(({ label, value, icon: Icon }) => (
                              <div
                                key={label}
                                className="bg-white rounded-lg p-3 border border-primary/10"
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  {Icon && (
                                    <Icon className="w-3 h-3 text-primary" />
                                  )}
                                  <p className="text-xs text-gray-500">
                                    {label}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-primary">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 px-6"
                        onClick={handleReset}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="h-12 px-8 bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors"
                        disabled={
                          submitting ||
                          hasOutstandingBalance ||
                          !canSubmitLoan || // ✅ add
                          checkingFloat || // ✅ add
                          (isBusiness && !businessType)
                        }
                        title={
                          !canSubmitLoan
                            ? "Float record not found for today"
                            : hasOutstandingBalance
                              ? "Cannot renew due to outstanding balance"
                              : isBusiness && !businessType
                                ? "Business type is required"
                                : ""
                        }
                      >
                        {checkingFloat ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Checking...
                          </>
                        ) : submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Submitting...
                          </>
                        ) : hasOutstandingBalance ? (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Renewal Blocked
                          </>
                        ) : !canSubmitLoan ? (
                          "Float Not Available"
                        ) : (
                          "Submit Renewal"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════ GUARANTOR TAB ══════════ */}
            <TabsContent value="guarantor" className="mt-6">
              <Guarantor
                onGuarantorAdded={() => {
                  console.log("Guarantor(s) added successfully");
                }}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default RenewLoan;
