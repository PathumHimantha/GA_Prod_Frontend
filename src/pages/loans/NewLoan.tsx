import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "lucide-react";
import { API } from "@/apiConfig";
import { getCenters, Center } from "@/lib/centerHelper";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import Guarantor from "./Guarantor";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { toUpperOnChange } from "@/lib/textUtils";
import { isValidNICFormat, getNICValidationMessage } from "@/lib/NICvalidation";
import { BANKS } from "@/lib/bank";
// ─────────────────────────────────────────────────────────────
// FILE UPLOAD FIELD  (unchanged original UI)
// ─────────────────────────────────────────────────────────────
interface FileUploadFieldProps {
  id: string;
  label: string;
  required?: boolean;
  onFile?: (file: File | null) => void; // ← new: reports file up to parent
}

const FileUploadField = ({
  id,
  label,
  required = false,
  onFile,
}: FileUploadFieldProps) => {
  const [fileName, setFileName] = useState("No file chosen");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0] || null;
    if (!raw) {
      setFileName("No file chosen");
      setPreview(null);
      onFile?.(null);
      return;
    }

    // ── Compress images to < 900 KB before storing ────────────
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

    onFile?.(file); // ← compressed file goes to parent / FormData
  };
  const clearFile = () => {
    setFileName("No file chosen");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onFile?.(null);
  };

  return (
    <div className="group relative rounded-xl border border-border bg-background p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          {preview ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shadow-sm">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
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
              onClick={clearFile}
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
            {preview ? fileName : "JPG, PNG or PDF accepted"}
          </p>
          {!preview && (
            <label
              htmlFor={id}
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
            >
              <Upload size={12} />
              Browse
            </label>
          )}
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
// Change the component signature
const NewLoan = ({
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

  // ── Tab ───────────────────────────────────────────────────
  const [tab, setTab] = useState<"loan" | "guarantor">("loan");

  // ── Centers / Groups ──────────────────────────────────────
  const [centers, setCenters] = useState<Center[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [centerCode, setCenterCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [loadingMemberNo, setLoadingMemberNo] = useState(false);
  const [businessType, setBusinessType] = useState("");
  // ── Group limit error state ────────────────────────────────
  const [groupLimitError, setGroupLimitError] = useState<{
    message: string;
    nextGroup: string;
  } | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"Current" | "Saving" | "">("");
  const [accountNo, setAccountNo] = useState("");
  const [confirmAccountNo, setConfirmAccountNo] = useState("");
  const [accountNoError, setAccountNoError] = useState("");
  const handleConfirmAccountNoChange = (val: string) => {
    setConfirmAccountNo(val);
    setAccountNoError(
      val && accountNo && val !== accountNo
        ? "Account numbers do not match"
        : "",
    );
  };

  const handleAccountNoChange = (val: string) => {
    setAccountNo(val);
    setAccountNoError(
      confirmAccountNo && val !== confirmAccountNo
        ? "Account numbers do not match"
        : "",
    );
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

  // Fetch next member number when center and group are selected
  useEffect(() => {
    const fetchMemberNumber = async () => {
      const selectedBranchData = branchOptions.find(
        (b) => b.value === selectedBranch,
      );
      const bcode = selectedBranchData?.sub || user?.bcode || "";

      if (!bcode || !centerCode || !selectedGroup) {
        setMemberNumber("");
        return;
      }

      setLoadingMemberNo(true);
      setGroupLimitError(null); // Clear any previous error
      try {
        const url = `${API.loan.nextMemberNumber}?bcode=${bcode}&ccode=${centerCode}&group=${selectedGroup}`;
        console.log("Fetching member number from:", url);

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Member number data:", data);

        if (data.error === "GROUP_LIMIT_REACHED") {
          // Show warning message instead of alert
          setGroupLimitError({
            message: `Group ${selectedGroup} already has 5 members. Maximum limit reached.`,
            nextGroup: data.next_group,
          });
          setMemberNumber("");
        } else {
          setMemberNumber(data.member_number);
          setGroupLimitError(null);
        }
      } catch (error) {
        console.error("Failed to fetch member number:", error);
      } finally {
        setLoadingMemberNo(false);
      }
    };

    fetchMemberNumber();
  }, [user?.bcode, centerCode, selectedGroup]);

  const [selectedBranch, setSelectedBranch] = useState(
    user?.status === "executive" ||
      user?.status === "manager" ||
      user?.status === "branch_manager"
      ? user?.bname || ""
      : "",
  );
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);

  const isKegalleUser =
    (user?.status === "executive" ||
      user?.status === "manager" ||
      user?.status === "branch_manager") &&
    user?.bname?.toUpperCase() === "KEGALLE";

  const showBranchSelect =
    user?.status === "admin" ||
    user?.status === "zone_head" ||
    user?.status === "regional_manager" ||
    isKegalleUser;

  useEffect(() => {
    if (!user) return;
    if (showBranchSelect) {
      const params = new URLSearchParams({
        role: user.status || "",
        bname: user.bname || "",
        userid: user.id?.toString() || "",
      });
      fetch(`${API.helper.branches}?${params}`)
        .then((r) => r.json())
        .then((d) =>
          setBranchOptions(
            (d.branches || []).map((b: { bname: string; bcode: string }) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ),
        );
    } else if (isKegalleUser) {
      // KEGALLE executives see KEGALLE + NARAMMALA
      setBranchOptions([
        { label: "KEGALLE", value: "KEGALLE" },
        { label: "NARAMMALA", value: "NARAMMALA" },
      ]);
      setSelectedBranch(user.bname || "");
    } else {
      setSelectedBranch(user.bname || "");
    }
  }, [user]);

  useEffect(() => {
    if (selectedBranch) {
      getCenters(
        selectedBranch,
        isBusiness ? "B" : isDaily ? "D" : "C",
        user?.id,
      ).then(setCenters);
    } else {
      setCenters([]);
    }
    // reset center/group when branch changes
    setSelectedCenter("");
    setCenterCode("");
    setSelectedGroup("");
    setGroups([]);
  }, [selectedBranch, dayName, isBusiness, isDaily]);

  const centerOptions: SelectOption[] = centers.map((c) => ({
    label: c.center,
    value: c.center,
    sub: c.ccode,
  }));
  const groupOptions: SelectOption[] = groups.map((g) => ({
    label: `Group ${g}`,
    value: g,
  }));

  const handleCenterChange = async (value: string, option: SelectOption) => {
    setSelectedCenter(value);
    setCenterCode(option.sub || "");
    setSelectedGroup("");
    setGroups([]);
    if (!value || !selectedBranch) return;
    setLoadingGroups(true);
    try {
      const res = await fetch(API.branch.groupsByCenter(selectedBranch, value)); // ← changed
      const data = await res.json();
      if (res.ok) setGroups(data.groups || []);
    } finally {
      setLoadingGroups(false);
    }
  };

  // ── Phone validation ──────────────────────────────────────
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [phone1Error, setPhone1Error] = useState("");
  const [phone2Error, setPhone2Error] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorPhoneError, setGuarantorPhoneError] = useState("");

  const handlePhone1Change = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 10);
    setPhone1(d);
    setPhone1Error(
      d.length > 0 && d.length !== 10 ? "Must be exactly 10 digits" : "",
    );
  };
  const handlePhone2Change = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 10);
    setPhone2(d);
    setPhone2Error(
      d.length > 0 && d.length !== 10 ? "Must be exactly 10 digits" : "",
    );
  };

  // ── NIC live check ────────────────────────────────────────
  const [nic, setNic] = useState("");
  const [nicStatus, setNicStatus] = useState<
    "idle" | "checking" | "ok" | "error"
  >("idle");
  const [nicMessage, setNicMessage] = useState("");
  const nicTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleNicChange = (val: string) => {
    // Block input beyond 12 chars
    if (val.length > 12) return;

    setNic(val);
    setNicStatus("idle");
    setNicMessage("");
    clearTimeout(nicTimer.current);

    // ── Local format validation first ──
    const formatError = getNICValidationMessage(val);
    if (formatError) {
      setNicStatus("error");
      setNicMessage(formatError);
      return;
    }

    // ── Only call API when NIC is complete ──
    const isComplete = isValidNICFormat(val);
    if (!isComplete || !user?.bcode) return;

    nicTimer.current = setTimeout(async () => {
      setNicStatus("checking");
      try {
        const res = await fetch(API.loan.validateNic(val, user.bcode));
        const data = await res.json();
        if (data.hasActiveLoan) {
          setNicStatus("error");
          setNicMessage(
            `Active loan exists — ${data.customer?.cname || "customer"}`,
          );
        } else {
          setNicStatus("ok");
          setNicMessage(
            data.customer
              ? `Known: ${data.customer.cname}`
              : "NIC clear — no active loan",
          );
        }
      } catch {
        setNicStatus("idle");
      }
    }, 600);
  };

  // ── Files dict ────────────────────────────────────────────
  // key = field name that will be sent to backend as FormData field
  const files = useRef<Record<string, File | null>>({});
  const setFile = (key: string) => (f: File | null) => {
    files.current[key] = f;
  };

  // ── Other form fields ─────────────────────────────────────
  const [cname, setCname] = useState("");
  const [address, setAddress] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [address3, setAddress3] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanDate, setLoanDate] = useState(dateStr);
  const [period, setPeriod] = useState("13");
  const [interest, setInterest] = useState("30");
  const [docFee, setDocFee] = useState("0");
  const [insFee, setInsFee] = useState("0");
  const [loanCat, setLoanCat] = useState(
    isBusiness ? "Business Loan" : isDaily ? "Daily Loan" : "Consumer Loan",
  );
  const [gName, setGName] = useState("");
  const [gNic, setGNic] = useState("");
  const [gAddress, setGAddress] = useState("");

  // ── Submit state ──────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);
  const [submitError, setSubmitError] = useState("");
  const [isWeekend, setIsWeekend] = useState(false);
  const [submittedLoanCode, setSubmittedLoanCode] = useState("");

  useEffect(() => {
    setLoanCat(
      isBusiness ? "Business Loan" : isDaily ? "Daily Loan" : "Consumer Loan",
    );
  }, [isBusiness, isDaily]);
  useEffect(() => {
    if (loanAmount && !isNaN(parseFloat(loanAmount))) {
      const amount = parseFloat(loanAmount);
      // 1% each for document fee and insurance fee
      setDocFee((amount * 0.01).toFixed(2));
      setInsFee((amount * 0.01).toFixed(2));
    } else {
      setDocFee("0");
      setInsFee("0");
    }
  }, [loanAmount]);
  // Special center overrides for G01 branch
  useEffect(() => {
    const SPECIAL_CCODES = ["023", "024", "013"];

    if (
      selectedBranch?.toUpperCase() === "KEGALLE" &&
      SPECIAL_CCODES.includes(centerCode)
    ) {
      setPeriod("12");
      setInterest("20");
    } else {
      // Reset to defaults when switching away
      setPeriod("13");
      setInterest("30");
    }
  }, [centerCode, selectedBranch]);
  useEffect(() => {
    const day = today.getDay(); // 0 = Sunday, 6 = Saturday
    setIsWeekend(day === 0 || day === 6);
  }, []);
  // ── Submit handler ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nicStatus === "error") {
      setSubmitError("Resolve NIC issue first");
      return;
    }
    const requiredFiles =
      isBusiness || isDaily
        ? [
            { key: "image", label: "Customer Photo" },
            { key: "application_form", label: "Application Form" },
            { key: "application_form_2", label: "Application Form 2" },
            { key: "loan_agreement", label: "Loan Agreement (Photo 1)" },
            { key: "loan_agreement_2", label: "Loan Agreement (Photo 2)" },
            { key: "customer_id_copy", label: "Customer ID Copy" },
            { key: "husband_id_copy", label: "Husband ID Copy" },
            { key: "marriage_certificate", label: "Marriage Certificate" },
            { key: "billing_proof", label: "Billing Proof" },
            { key: "promissory_note", label: "Promissory Note" },
            // Budget Report: Required for Business loans ALWAYS, and Daily loans only when amount >= 30000
            ...(isBusiness ||
            (isDaily && parseFloat(loanAmount || "0") >= 30000)
              ? [{ key: "budget_report", label: "Budget Report" }]
              : []),
            ...(requiresBankDetails
              ? [{ key: "bank_passbook", label: "Bank Passbook" }]
              : []),
          ]
        : [
            { key: "image", label: "Customer Photo" },
            { key: "application_form", label: "Application Form" },
            { key: "loan_agreement", label: "Loan Agreement (Photo 1)" },
            { key: "loan_agreement_2", label: "Loan Agreement (Photo 2)" },
            { key: "customer_id_copy", label: "Customer ID Copy" },
            { key: "husband_id_copy", label: "Husband ID Copy" },
            { key: "marriage_certificate", label: "Marriage Certificate" },
            { key: "billing_proof", label: "Billing Proof" },
            { key: "promissory_note", label: "Promissory Note" },
          ];

    const missingFiles = requiredFiles.filter((f) => !files.current[f.key]);
    if (missingFiles.length > 0) {
      setSubmitError(
        `Please upload required documents: ${missingFiles.map((f) => f.label).join(", ")}`,
      );
      return;
    }
    const selectedBranchData = branchOptions.find(
      (b) => b.value === selectedBranch,
    );

    const bcode = selectedBranchData?.sub || user?.bcode || "";
    setSubmitting(true);
    setSubmitError("");

    // Build multipart FormData so files + text go in one request
    const fd = new FormData();
    fd.append("loan_type", "newloan");
    fd.append("loan_category", loanCat);
    fd.append("bname", selectedBranch);
    fd.append("bcode", bcode);
    fd.append("center", selectedCenter);
    fd.append("ccode", centerCode);
    fd.append("groupname", selectedGroup);
    fd.append("cname", cname);
    fd.append("executive_name", user?.name || "");
    fd.append("nic", nic);
    fd.append(
      "address",
      [address, address1, address2, address3].filter(Boolean).join(", "),
    );
    fd.append("phone1", phone1);
    fd.append("phone2", phone2);
    fd.append("loan_amount", loanAmount);
    fd.append("period", period);
    fd.append("interest", interest);
    fd.append("loan_date", loanDate);
    fd.append("document_fee", docFee);
    fd.append("insurance_fee", insFee);
    fd.append("guarantor_name", gName);
    fd.append("guarantor_nic", gNic);
    fd.append("guarantor_address", gAddress);
    fd.append("guarantor_phone", guarantorPhone);
    if (isBusiness) {
      fd.append("business_type", businessType);
    }
    if (requiresBankDetails) {
      fd.append("bank_name_account", bankName);
      fd.append("account_type", accountType);
      fd.append("account_no", accountNo);
    }
    // Append any uploaded files
    Object.entries(files.current).forEach(([key, file]) => {
      if (file) fd.append(key, file);
    });

    try {
      const res = await fetch(
        isDaily ? API.dailyloan.submitDaily : API.loan.submit,
        { method: "POST", body: fd },
      );
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit");
        return;
      }
      setSubmitSuccess(data);
      setTimeout(() => {
        navigate(`/dashboard/loan-success?loan_code=${data.loan_code}`);
      }, 1500);
      setSubmittedLoanCode(data.loan_code || "");
      setTimeout(() => setSubmitSuccess(null), 1000);
    } catch {
      setSubmitError("Cannot connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  const showBusinessDocs = isBusiness || isDaily;
  const requiresBankDetails =
    isBusiness || (isDaily && parseFloat(loanAmount || "0") >= 30000);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header Bar (original) ── */}
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

      {/* ── Success / Error banners ── */}
      {submitSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">
              Loan submitted successfully!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Loan Code:{" "}
              <span className="font-mono font-bold">
                {submitSuccess.loan_code}
              </span>
              {submitSuccess.customer_code && (
                <>
                  {" "}
                  &nbsp;·&nbsp; Customer:{" "}
                  <span className="font-mono font-bold">
                    {submitSuccess.customer_code}
                  </span>
                </>
              )}
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

      {/* ── Tabs (original UI) ── */}
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

        {/* ════════════════════════════ LOAN TAB ════════════════════════════ */}
        <TabsContent value="loan" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    New Loan Application
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fill in the customer and loan details below
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* ── Center & Group ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Center Information
                  </h3>
                  {/* ── Branch (admin/zone_head/regional_manager only) ── */}
                  {showBranchSelect && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Branch <span className="text-destructive">*</span>
                        </Label>
                        <SearchableSelect
                          options={branchOptions}
                          value={selectedBranch}
                          onChange={(v) => {
                            setSelectedBranch(v);
                            setSelectedCenter("");
                            setCenterCode("");
                            setSelectedGroup("");
                            setGroups([]);
                          }}
                          placeholder="Select Branch"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Center <span className="text-destructive">*</span>
                      </Label>
                      <SearchableSelect
                        options={centerOptions}
                        value={selectedCenter}
                        onChange={handleCenterChange}
                        placeholder="Select Center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Center Code
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={centerCode}
                          readOnly
                          className="pl-9 h-12 bg-muted/50 border-border font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Group <span className="text-destructive">*</span>
                      </Label>
                      <SearchableSelect
                        options={groupOptions}
                        value={selectedGroup}
                        onChange={(v) => setSelectedGroup(v)}
                        placeholder={
                          selectedCenter
                            ? loadingGroups
                              ? "Loading..."
                              : "Select Group"
                            : "Select center first"
                        }
                        disabled={!selectedCenter || loadingGroups}
                      />
                    </div>
                  </div>
                  {/* Member Number Display */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Member Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        value={memberNumber}
                        readOnly
                        placeholder={
                          loadingMemberNo
                            ? "Loading..."
                            : groupLimitError
                              ? "Group full"
                              : "Will be auto-generated"
                        }
                        className={`pl-9 h-12 bg-muted/50 border-border font-mono font-bold ${
                          groupLimitError
                            ? "border-destructive text-destructive"
                            : memberNumber === ""
                              ? "text-muted-foreground"
                              : "text-primary"
                        }`}
                      />
                      {loadingMemberNo && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>

                    {/* Warning message for group limit */}
                    {groupLimitError && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">
                            {groupLimitError.message}
                          </p>
                          <p className="text-xs mt-1">
                            Please use group{" "}
                            <span className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                              {groupLimitError.nextGroup}
                            </span>{" "}
                            for new members.
                          </p>
                          <Button
                            type="button"
                            variant="link"
                            className="text-xs text-amber-700 underline p-0 h-auto mt-1"
                            onClick={() => {
                              window.location.href = `/dashboard/new-group?branch=${user?.bcode}&center=${selectedCenter}&ccode=${centerCode}&currentGroup=${selectedGroup}&nextGroup=${groupLimitError.nextGroup}`;
                            }}
                          >
                            Create new group {groupLimitError.nextGroup} →
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        {memberNumber
                          ? `Next available member number in group ${selectedGroup}`
                          : groupLimitError
                            ? "This group has reached its maximum capacity"
                            : "Select center and group to see member number"}
                      </p>
                      {memberNumber && (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                          Max 5 per group
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── Customer Info ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Customer Name{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={cname}
                          onChange={(e) => toUpperOnChange(e, setCname)}
                          placeholder="Enter customer name"
                          className="pl-9 h-12 bg-background border-border"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Customer NIC <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={nic}
                          onChange={(e) => handleNicChange(e.target.value)}
                          placeholder="Enter NIC number"
                          className={`pl-9 h-12 bg-background border-border pr-10 ${nicStatus === "error" ? "border-destructive" : nicStatus === "ok" ? "border-green-400" : ""}`}
                          required
                        />
                        {nicStatus === "checking" && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                        )}
                        {nicStatus === "ok" && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                        {nicStatus === "error" && (
                          <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                        )}
                      </div>
                      {nicMessage && (
                        <p
                          className={`text-xs flex items-center gap-1 ${nicStatus === "error" ? "text-destructive" : "text-green-600"}`}
                        >
                          {nicStatus === "error" ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {nicMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── Address ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" />
                    Address Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        House No
                      </Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          onChange={(e) => toUpperOnChange(e, setAddress)}
                          placeholder="Enter house no / street"
                          className="pl-9 h-12 bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Address 1
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={address1}
                          onChange={(e) => toUpperOnChange(e, setAddress1)}
                          placeholder="Enter city"
                          className="pl-9 h-12 bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Address 2
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={address2}
                          onChange={(e) => toUpperOnChange(e, setAddress2)}
                          placeholder="Enter state"
                          className="pl-9 h-12 bg-background border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Address 3
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={address2}
                          onChange={(e) => toUpperOnChange(e, setAddress2)}
                          placeholder="Enter postal code"
                          className="pl-9 h-12 bg-background border-border"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── Phone Numbers ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Contact Numbers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Mobile Number{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="tel"
                          value={phone1}
                          onChange={(e) => handlePhone1Change(e.target.value)}
                          placeholder="Enter 10-digit number"
                          className={`pl-9 h-12 bg-background border-border ${phone1Error ? "border-destructive" : ""}`}
                          required
                          maxLength={10}
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Mobile Number 2
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="tel"
                          value={phone2}
                          onChange={(e) => handlePhone2Change(e.target.value)}
                          placeholder="Enter 10-digit number (optional)"
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

                {/* ── Customer Image ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Customer Photo
                  </h3>
                  <FileUploadField
                    id="image"
                    label="Image of Customer"
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Required docs */}
                    <Card className="border border-border shadow-sm overflow-hidden">
                      <CardHeader className="py-3 px-5 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold text-foreground">
                              Required Documents
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">
                              Upload all mandatory files
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FileUploadField
                          id="application_form"
                          label="Application Form"
                          required
                          onFile={setFile("application_form")}
                        />
                        <FileUploadField
                          id="application_form_2"
                          label="Application Form (Page 2)"
                          onFile={setFile("application_form_2")}
                        />
                        <FileUploadField
                          id="customer_id_copy"
                          label="Customer ID Copy"
                          required
                          onFile={setFile("customer_id_copy")}
                        />
                        <FileUploadField
                          id="husband_id_copy"
                          label="Husband ID Copy"
                          required
                          onFile={setFile("husband_id_copy")}
                        />
                        <FileUploadField
                          id="marriage_certificate"
                          label="Marriage Certificate"
                          required
                          onFile={setFile("marriage_certificate")}
                        />
                        <FileUploadField
                          id="billing_proof"
                          label="Billing Proof"
                          required
                          onFile={setFile("billing_proof")}
                        />
                        <FileUploadField
                          id="loan_agreement_general"
                          label="Loan Agreement (Photo 1)"
                          required
                          onFile={setFile("loan_agreement")}
                        />
                        <FileUploadField
                          id="loan_agreement_2_general"
                          label="Loan Agreement (Photo 2)"
                          required
                          onFile={setFile("loan_agreement_2")}
                        />
                        <FileUploadField
                          id="promissory_note_general"
                          label="Promissory Note"
                          required
                          onFile={setFile("promissory_note")}
                        />
                      </CardContent>
                    </Card>

                    {showBusinessDocs && (
                      <Card className="border border-border shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-5 bg-gradient-to-r from-accent/10 to-accent/5 border-b border-border">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                              <Building2 className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold text-foreground">
                                Business Loan Documents
                              </CardTitle>
                              <p className="text-[11px] text-muted-foreground">
                                Optional business documents
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FileUploadField
                            id="loan_agreement"
                            label="Loan Agreement (Photo 1)"
                            required
                            onFile={setFile("loan_agreement")}
                          />
                          <FileUploadField
                            id="loan_agreement_2"
                            label="Loan Agreement (Photo 2)"
                            required
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
                          {requiresBankDetails && (
                            <FileUploadField
                              id="bank_passbook"
                              label="Bank Passbook"
                              onFile={setFile("bank_passbook")}
                            />
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <Separator />
                {/* ── Bank Account (Business Loan only) ── */}
                {requiresBankDetails && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-primary" />
                      Bank Account Details
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
                              accountType === "Current" ? "default" : "outline"
                            }
                            onClick={() => setAccountType("Current")}
                            className="flex-1 h-12"
                          >
                            Current
                          </Button>
                          <Button
                            type="button"
                            variant={
                              accountType === "Saving" ? "default" : "outline"
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
                          Account No <span className="text-destructive">*</span>
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
                )}

                {/* ── Loan Info ── */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-primary" />
                    Loan Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Loan Amount <span className="text-destructive">*</span>
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
                      <div className="space-y-2">
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
                        <p className="text-xs text-muted-foreground">
                          Select the type of business for this loan
                        </p>
                      </div>
                    )}
                    <div className="hidden">
                      <Label className="text-sm font-medium text-foreground">
                        Loan Period
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={`${period} Weeks`}
                          readOnly
                          className="pl-9 h-12 bg-muted/50 border-border"
                        />
                      </div>
                    </div>
                    <div className="hidden">
                      <Label className="text-sm font-medium text-foreground">
                        Interest Rate
                      </Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          value={`${interest}%`}
                          readOnly
                          className="pl-9 h-12 bg-muted/50 border-border"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Submit ── */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-6"
                    onClick={() => {
                      setSubmitError("");
                      setSubmitSuccess(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 px-8 bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors"
                    disabled={
                      submitting ||
                      nicStatus === "error" ||
                      isWeekend ||
                      !memberNumber ||
                      groupLimitError !== null ||
                      !canSubmitLoan || // ✅ add
                      checkingFloat || // ✅ add
                      (isBusiness && !businessType) ||
                      (requiresBankDetails &&
                        (!bankName ||
                          !accountType ||
                          !accountNo ||
                          accountNo !== confirmAccountNo))
                    }
                    title={
                      !canSubmitLoan
                        ? "Float record not found for today"
                        : checkingFloat
                          ? "Checking float status..."
                          : isWeekend
                            ? "Loan applications cannot be submitted on weekends"
                            : !memberNumber
                              ? "Member number is required"
                              : groupLimitError
                                ? "Group is full"
                                : isBusiness && !businessType
                                  ? "Select a business type"
                                  : requiresBankDetails &&
                                      (!bankName ||
                                        !accountType ||
                                        !accountNo ||
                                        accountNo !== confirmAccountNo)
                                    ? "Complete bank account details"
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
                    ) : isWeekend ? (
                      "Weekend - Cannot Submit"
                    ) : !canSubmitLoan ? (
                      "Float Not Available"
                    ) : (
                      "Submit Loan Application"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════════════ GUARANTOR TAB ════════════════════════════ */}
        <TabsContent value="guarantor" className="mt-6">
          <Guarantor
            onGuarantorAdded={() => {
              // Optional: Show a success message or switch tabs
              console.log("Guarantor(s) added successfully");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewLoan;
