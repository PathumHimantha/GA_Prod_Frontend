import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Search,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  History,
  Download,
  Printer,
  TrendingUp,
  User,
  Eye,
  EyeOff,
  Shield,
  House,
  PinOffIcon,
  Sun,
  Receipt,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RecoveryStatus from "./RecoveryStatus"; // adjust path
// ── API base ────────────────────────────────────────────────────────────────
import { API_BASE_URL } from "@/apiConfig";
import { Separator } from "@radix-ui/react-separator";

// ── Types ────────────────────────────────────────────────────────────────────
interface CustomerRow {
  loan_code: string;
  customer_code: string;
  name: string;
  cname: string;
  nic: string;
  address: string;
  phone1: string;
  phone2?: string;
  center: string;
  ccode: string;
  bname: string;
  group: string;
  loan_amount: number;
  loan_balance: number;
  loan_date: string;
  due_date: string;
  type: string;
  loan_category: string;
  document_fee: number;
  insurance_fee: number;
  week_payment: number;
  full_loan: number;
  image?: string;
}

interface LoanRow {
  loan_code: string;
  customer_code: string;
  name: string;
  nic: string;
  loan_amount: number;
  loan_balance: number;
  loan_date: string;
  due_date: string;
  type: string;
  loan_category: string;
  document_fee: number;
  insurance_fee: number;
  business_type: string;
  center: string;
  bname: string;
  week_payment: number;
  full_loan: number;
  bank: string;
  account_type: string;
  account_no: string;
}

interface PaymentRow {
  id: number;
  loan_code: string;
  date: string;
  amount: number;
  week_number: number;
  center: string;
  bname: string;
  added_by: string;
  arriarse: string | null;
  payment_method: string | null;
  cdk_number: string | null;
  slip_path: string | null;
}

interface Summary {
  totalLoanAmount: number;
  totalBalance: number;
  totalPaid: number;
  activeLoans: number;
  completedLoans: number;
}
interface CustomerDocuments {
  id: number;
  customer_code: string;
  loan_code: string;
  customer_id_copy: string | null;
  husband_id_copy: string | null;
  marriage_certificate: string | null;
  billing_proof: string | null;
  application_form: string | null;
  application_form_2: string | null;
  loan_agreement: string | null;
  loan_agreement_2: string | null;
  promissory_note: string | null;
  bank_passbook: string | null;
  budget_report: string | null;
}
interface DeathSettlement {
  id: number;
  loan_code: string;
  customer_code: string;
  week_number: number;
  due_date_weekly: string;
  bname: string;
  center: string;
  ccode: string;
  payment: number;
  nic: string;
  name: string;
  payment_date: string;
  week_payment: string;
  type: string;
  created_at: string;
  approval_status: string;
  approved_by: string;
  approved_at: string;
  remarks: string;
  donation_amount: number | null;
  donation_slip: string | null;
  donation_added_by: string | null;
  donation_added_at: string | null;
  marriage_certificate: string | null;
  bank_passbook: string | null;
  death_certificate: string | null;
  donation_request_letter: string | null;
}
interface CustomerCharge {
  id: number;
  customer_code: string;
  loan_code: string;
  charge_type: string;
  note: string | null;
  charge: number;
  date: string;
  added_by: string | null;
  created_at: string;
}
// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `Rs. ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const initials = (cname: string) =>
  cname
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .substring(0, 2)
    .toUpperCase();

const dateStr = (d?: string) => (d ? d.slice(0, 10) : "—");

// ── Badges ───────────────────────────────────────────────────────────────────
const LoanBadge = ({ balance }: { balance: number }) =>
  Number(balance) > 0 ? (
    <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
      Active
    </Badge>
  ) : (
    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
      Completed
    </Badge>
  );
const PaymentMethodBadge = ({
  method,
  cdkNumber,
}: {
  method: string | null;
  cdkNumber: string | null;
}) => {
  const config: Record<string, { className: string; label: string }> = {
    "Online Payment": {
      className: "bg-blue-100 text-blue-700 border-blue-200",
      label: "Online",
    },
    "Bank Deposit": {
      className: "bg-green-100 text-green-700 border-green-200",
      label: "Bank",
    },
    CDK: {
      className: "bg-purple-100 text-purple-700 border-purple-200",
      label: cdkNumber ? `CDK #${cdkNumber}` : "CDK",
    },
    Cheque: {
      className: "bg-teal-100 text-teal-700 border-teal-200",
      label: "Cheque",
    },
  };
  const cfg = method
    ? (config[method] ?? {
        className: "bg-gray-100 text-gray-700 border-gray-200",
        label: method,
      })
    : {
        className: "bg-amber-100 text-amber-700 border-amber-200",
        label: "Cash",
      };

  return (
    <Badge className={`text-xs border ${cfg.className}`}>{cfg.label}</Badge>
  );
};
// ── Component ─────────────────────────────────────────────────────────────────
const PaymentHistory = () => {
  const { user } = useAuth();
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const todayStr = today.toISOString().split("T")[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [customerFound, setCustomerFound] = useState(false);

  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [expandedLoans, setExpandedLoans] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showFullDetails, setShowFullDetails] = useState(false);
  // Inside PaymentHistory component, add these states:
  const [documents, setDocuments] = useState<CustomerDocuments | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [loanDocuments, setLoanDocuments] = useState<Record<string, any>>({});
  const [docFileSources, setDocFileSources] = useState<
    Record<string, string | null>
  >({});
  const [deathSettlements, setDeathSettlements] = useState<DeathSettlement[]>(
    [],
  );
  const [customerCharges, setCustomerCharges] = useState<CustomerCharge[]>([]);
  const [totalCharges, setTotalCharges] = useState(0);
  const [chargesLoading, setChargesLoading] = useState(false);

  // Add legal charge form state
  const [newChargeLoanCode, setNewChargeLoanCode] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [newChargeNote, setNewChargeNote] = useState("");
  const [addingCharge, setAddingCharge] = useState(false);
  const [chargeError, setChargeError] = useState("");
  const [chargeSuccess, setChargeSuccess] = useState("");

  const fetchCustomerCharges = async (customer_code: string) => {
    setChargesLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/payments/customer-charges?customer_code=${encodeURIComponent(customer_code)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setCustomerCharges(data.charges || []);
        setTotalCharges(data.totalCharges || 0);
      }
    } catch (err) {
      console.error("Failed to fetch customer charges", err);
    } finally {
      setChargesLoading(false);
    }
  };

  const handleAddLegalCharge = async () => {
    setChargeError("");
    setChargeSuccess("");

    if (!newChargeLoanCode) {
      setChargeError("Please select a loan code");
      return;
    }
    if (!newChargeAmount || parseFloat(newChargeAmount) <= 0) {
      setChargeError("Please enter a valid charge amount");
      return;
    }

    setAddingCharge(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/payments/customer-charges/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_code: customer?.customer_code,
            loan_code: newChargeLoanCode,
            charge: newChargeAmount,
            note: newChargeNote || "Manual legal charge added",
            added_by: user?.name || null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setChargeError(data.error || "Failed to add charge");
        return;
      }
      setChargeSuccess("Legal charge added successfully");
      setNewChargeLoanCode("");
      setNewChargeAmount("");
      setNewChargeNote("");
      if (customer?.customer_code) {
        fetchCustomerCharges(customer.customer_code);
      }
      setTimeout(() => setChargeSuccess(""), 3000);
    } catch (err) {
      setChargeError("Cannot connect to server.");
    } finally {
      setAddingCharge(false);
    }
  };
  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Please enter Customer Code, Loan Code, or NIC");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    setCustomerFound(false);

    try {
      const url = `${API_BASE_URL}/api/customers/search?query=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "No customer found");

      setCustomer(data.customer);
      setLoans(Array.isArray(data.loans) ? data.loans : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setSummary(data.summary || null);
      setDeathSettlements(
        Array.isArray(data.deathSettlements) ? data.deathSettlements : [],
      );
      setCustomerFound(true);
      fetchDocuments(data.customer.customer_code);
      fetchCustomerCharges(data.customer.customer_code);
    } catch (err: any) {
      setSearchError(err.message || "No customer found");
      setCustomer(null);
      setLoans([]);
      setPayments([]);
      setSummary(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setCustomerFound(false);
    setCustomer(null);
    setLoans([]);
    setPayments([]);
    setSummary(null);
    setSearchError("");
    setExpandedLoans([]);
    setActiveTab("overview");
    setDocuments(null);
    setPreviewDoc(null);
    setDocFileSources({});
    setDeathSettlements([]);
    setCustomerCharges([]); // ← add
    setTotalCharges(0); // ← add
  };
  const toggleLoan = async (code: string) => {
    setExpandedLoans((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

    // Fetch docs if not already loaded
    if (!loanDocuments[code]) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/customers/documents/file-by-loan/${encodeURIComponent(code)}`,
        );
        const data = await res.json();
        if (res.ok) {
          setLoanDocuments((prev) => ({ ...prev, [code]: data.documents }));
        }
      } catch (err) {
        console.error("Failed to fetch loan documents", err);
      }
    }
  };
  // ── Derived ───────────────────────────────────────────────────────────────
  const activeLoan = loans.find((l) => Number(l.loan_balance) > 0) || null;

  // payments for a specific loan_code
  const paymentsFor = (loanCode: string) =>
    payments.filter((p) => p.loan_code === loanCode);
  const fetchDocuments = async (customer_code: string) => {
    setDocsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/customers/documents/${encodeURIComponent(customer_code)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents);
        setDocFileSources(data.file_sources || {}); // ← store sources
      }
    } catch (err) {
      console.error("Failed to fetch documents");
    } finally {
      setDocsLoading(false);
    }
  };
  const getLoanTypeBadge = (ccode: string | number) => {
    const codeValue = typeof ccode === "string" ? parseInt(ccode, 10) : ccode;

    if (codeValue >= 300 && codeValue < 800) {
      return {
        text: "Business Loan",
        className:
          "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200",
        icon: <TrendingUp className="w-3 h-3 mr-1" />,
      };
    } else if (codeValue >= 100 && codeValue < 300) {
      return {
        text: "Consumer Loan",
        className:
          "bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-200",
        icon: <User className="w-3 h-3 mr-1" />,
      };
    } else if (codeValue >= 800) {
      return {
        text: "Daily Loan",
        className:
          "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200",
        icon: <Sun className="w-3 h-3 mr-1" />,
      };
    }

    // ← default fallback for ccode < 100, NaN, or missing
    return {
      text: "Unknown",
      className: "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200",
      icon: <CreditCard className="w-3 h-3 mr-1" />,
    };
  };
  const LoanStatusBadge = ({
    dueDate,
    balance,
  }: {
    dueDate: string;
    balance: number;
  }) => {
    if (Number(balance) === 0)
      return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
    const isOverdue =
      dueDate && dueDate.slice(0, 10) < new Date().toISOString().split("T")[0];
    return isOverdue ? (
      <Badge className="bg-red-100 text-red-700">LAP</Badge>
    ) : (
      <Badge className="bg-green-100 text-green-700">Active</Badge>
    );
  };
  // ── Auto-search from URL query param (?customer_code=... or ?loan_code=... or ?nic=...) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCustomerCode = params.get("customer_code");
    const urlLoanCode = params.get("loan_code");
    const urlNic = params.get("nic");
    const query = urlCustomerCode || urlLoanCode || urlNic;

    if (query) {
      setSearchQuery(query);
      // trigger search directly instead of waiting for state to settle via handleSearch's closure
      (async () => {
        setIsSearching(true);
        setSearchError("");
        setCustomerFound(false);
        try {
          const url = `${API_BASE_URL}/api/customers/search?query=${encodeURIComponent(query)}`;
          const res = await fetch(url);
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "No customer found");

          setCustomer(data.customer);
          setLoans(Array.isArray(data.loans) ? data.loans : []);
          setPayments(Array.isArray(data.payments) ? data.payments : []);
          setSummary(data.summary || null);
          setDeathSettlements(
            Array.isArray(data.deathSettlements) ? data.deathSettlements : [],
          );
          setCustomerFound(true);
          fetchDocuments(data.customer.customer_code);
          fetchCustomerCharges(data.customer.customer_code);
        } catch (err: any) {
          setSearchError(err.message || "No customer found");
        } finally {
          setIsSearching(false);
        }
      })();
    }
  }, []); // eslint-disable-line
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6  mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Payment History
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View customer payment history and loan details
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">
              {todayStr}
            </span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {dayName}
            </span>
          </div>
        </div>

        {/* Search Card */}
        <Card className="mb-6 border-0 shadow-lg  mx-auto">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Search size={20} className="text-primary" />
              Search Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Enter Customer Code, Loan Code, or NIC"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 h-12 bg-white border-gray-200 w-full"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="h-12 px-6 gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </Button>
                {customerFound && (
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="h-12 px-6 gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Clear
                  </Button>
                )}
              </div>
              {searchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{searchError}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Customer Results ─────────────────────────────────────────────── */}
        {customerFound && customer && (
          <>
            {/* Profile Card */}
            <Card className="mb-6 border-0 shadow-lg  mx-auto overflow-hidden">
              <div
                className={`bg-gradient-to-r ${deathSettlements.length > 0 ? "from-red-100 via-red-50 to-transparent border-b-2 border-red-300" : "from-primary/10 via-primary/5 to-transparent"} p-6`}
              >
                {/* Death Settlement Alert Banner */}
                {deathSettlements.length > 0 && (
                  <div className="mb-4 p-3 bg-red-600 text-white rounded-lg flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2 font-bold text-base">
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                      DEATH SETTLEMENT
                    </div>
                    <div className="sm:ml-auto flex flex-wrap gap-4 text-sm">
                      {deathSettlements[0].donation_amount ? (
                        <>
                          <span>
                            ✓ Settled with{" "}
                            <strong>
                              {fmt(deathSettlements[0].donation_amount)}
                            </strong>
                          </span>
                          <span>
                            Approved by:{" "}
                            <strong>{deathSettlements[0].approved_by}</strong>
                          </span>
                          <span>
                            On:{" "}
                            <strong>
                              {dateStr(deathSettlements[0].approved_at)}
                            </strong>
                          </span>
                        </>
                      ) : (
                        <span className="font-medium">
                          ⚠ Loan continuing — taken over by family member
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center">
                    <Avatar className="w-24 h-32 border-4 border-white shadow-xl">
                      {customer.image ? (
                        <AvatarImage
                          src={`${API_BASE_URL}/api/customers/uploads/customer_images/${customer.image}`}
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary text-white text-3xl">
                        {initials(customer.cname)}
                      </AvatarFallback>
                    </Avatar>
                    <Badge className="mt-3 bg-primary/20 text-primary border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      Member
                    </Badge>
                  </div>

                  {/* Info Grid */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">
                        Customer Code
                      </Label>
                      <p className="text-sm font-mono font-semibold text-gray-900 mt-1">
                        {customer.customer_code}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Full Name</Label>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {customer.cname}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">NIC</Label>
                      <p className="text-sm font-mono text-gray-700 mt-1">
                        {customer.nic}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Phone</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {customer.phone1}
                        {customer.phone2 ? ` / ${customer.phone2}` : ""}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Branch / Center
                      </Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {customer.bname} / {customer.center}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Group</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        {customer.group || "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Loan Category
                      </Label>
                      <div className="mt-1">
                        <Badge
                          className={getLoanTypeBadge(customer.ccode).className}
                        >
                          {getLoanTypeBadge(customer.ccode).icon}
                          {getLoanTypeBadge(customer.ccode).text}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Executive Name
                      </Label>
                      <p className="text-sm text-gray-700">{customer.name}</p>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">
                        Loan Status
                      </Label>
                      <div className="mt-1">
                        <LoanStatusBadge
                          dueDate={customer.due_date}
                          balance={Number(customer.loan_balance)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {summary?.activeLoans ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Active Loans</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {summary?.completedLoans ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-lg font-bold text-amber-600">
                    {fmt(summary?.totalBalance ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">Balance</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {fmt(summary?.totalPaid ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">Total Paid</p>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className=" mx-auto"
            >
              <TabsList className="grid grid-cols-4 gap-2 bg-transparent h-auto p-0 mb-6">
                <TabsTrigger
                  value="overview"
                  className="px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl shadow-sm border border-gray-200 bg-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="loans"
                  className="px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl shadow-sm border border-gray-200 bg-white"
                >
                  <History className="w-4 h-4 mr-2" />
                  Loan History
                </TabsTrigger>
                <TabsTrigger
                  value="recovery"
                  className="px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl shadow-sm border border-gray-200 bg-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Recovery Status
                </TabsTrigger>
                <TabsTrigger
                  value="charges"
                  className="px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl shadow-sm border border-gray-200 bg-white"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Customer Charges
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl shadow-sm border border-gray-200 bg-white"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  All Payments
                </TabsTrigger>
              </TabsList>

              {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
              <TabsContent value="overview" className="space-y-6">
                {/* Active Loan */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <CreditCard size={20} className="text-primary" />
                      Current Active Loan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {activeLoan ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">
                              Loan Code
                            </Label>
                            <p className="text-sm font-mono font-semibold text-gray-900">
                              {activeLoan.loan_code}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Type
                            </Label>
                            <p className="text-sm text-gray-700">
                              {activeLoan.loan_category || activeLoan.type}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Loan Amount
                            </Label>
                            <p className="text-sm font-bold text-primary">
                              {fmt(activeLoan.loan_amount)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Full Loan (with interest)
                            </Label>
                            <p className="text-sm text-gray-700">
                              {fmt(activeLoan.full_loan)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Paid Amount
                            </Label>
                            <p className="text-sm font-medium text-green-600">
                              {fmt(
                                Number(activeLoan.full_loan) -
                                  Number(activeLoan.loan_balance),
                              )}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Remaining Balance
                            </Label>
                            <p className="text-sm font-medium text-amber-600">
                              {fmt(activeLoan.loan_balance)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              {activeLoan.loan_category === "Daily Loan"
                                ? "Daily Payment"
                                : "Weekly Payment"}
                            </Label>
                            <p className="text-sm font-bold text-gray-700">
                              {fmt(activeLoan.week_payment)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Due Date
                            </Label>
                            <p className="text-sm text-gray-700">
                              {dateStr(activeLoan.due_date)}
                            </p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Repayment Progress
                            </span>
                            <span className="font-medium text-primary">
                              {activeLoan.full_loan > 0
                                ? (
                                    ((Number(activeLoan.full_loan) -
                                      Number(activeLoan.loan_balance)) /
                                      Number(activeLoan.full_loan)) *
                                    100
                                  ).toFixed(1)
                                : "0"}
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              activeLoan.full_loan > 0
                                ? ((Number(activeLoan.full_loan) -
                                    Number(activeLoan.loan_balance)) /
                                    Number(activeLoan.full_loan)) *
                                  100
                                : 0
                            }
                            className="h-2"
                          />
                        </div>

                        {/* Recent Payments for active loan */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Recent Payments
                          </h4>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="text-xs">
                                    Date
                                  </TableHead>
                                  <TableHead className="text-xs">
                                    Week
                                  </TableHead>
                                  <TableHead className="text-xs">
                                    Amount
                                  </TableHead>
                                  <TableHead className="text-xs">
                                    Added By
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paymentsFor(activeLoan.loan_code).slice(0, 5)
                                  .length > 0 ? (
                                  paymentsFor(activeLoan.loan_code)
                                    .slice(0, 5)
                                    .map((p) => (
                                      <TableRow key={p.id}>
                                        <TableCell className="text-xs">
                                          {dateStr(p.date)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {p.week_number}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                          {fmt(p.amount)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {p.added_by || "—"}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                ) : (
                                  <TableRow>
                                    <TableCell
                                      colSpan={4}
                                      className="text-center text-xs text-gray-400 py-4"
                                    >
                                      No payments recorded yet
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        No active loans
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp size={20} className="text-primary" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {loans.length}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Total Loans
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">
                          {fmt(summary?.totalLoanAmount ?? 0)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Total Borrowed
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {fmt(summary?.totalPaid ?? 0)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Total Paid</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-amber-600">
                          {fmt(summary?.totalBalance ?? 0)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Current Balance
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Info */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <User size={20} className="text-primary" />
                        Personal Information
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullDetails(!showFullDetails)}
                        className="gap-1"
                      >
                        {showFullDetails ? (
                          <>
                            <EyeOff className="w-4 h-4" /> Show Less
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" /> Show Full Details
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">
                          Full Name
                        </Label>
                        <p className="text-sm text-gray-900">
                          {customer.cname}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">NIC</Label>
                        <p className="text-sm font-mono text-gray-700">
                          {customer.nic}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Phone</Label>
                        <p className="text-sm text-gray-700">
                          {customer.phone1}
                          {customer.phone2 ? ` / ${customer.phone2}` : ""}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Branch</Label>
                        <p className="text-sm text-gray-700">
                          {customer.bname}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Center</Label>
                        <p className="text-sm text-gray-700">
                          {customer.center}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Group</Label>
                        <p className="text-sm text-gray-700">
                          {customer.group || "—"}
                        </p>
                      </div>

                      {showFullDetails && (
                        <>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500">
                              Address
                            </Label>
                            <p className="text-sm text-gray-700">
                              {customer.address || "—"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Customer Code
                            </Label>
                            <p className="text-sm font-mono text-gray-700">
                              {customer.customer_code}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Latest Loan Code
                            </Label>
                            <p className="text-sm font-mono text-gray-700">
                              {customer.loan_code}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Loan Date
                            </Label>
                            <p className="text-sm text-gray-700">
                              {dateStr(customer.loan_date)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Due Date
                            </Label>
                            <p className="text-sm text-gray-700">
                              {dateStr(customer.due_date)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Document Fee
                            </Label>
                            <p className="text-sm text-gray-700">
                              {fmt(customer.document_fee)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              Insurance Fee
                            </Label>
                            <p className="text-sm text-gray-700">
                              {fmt(customer.insurance_fee)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {/* ── Documents Section ── */}
                    <div className="mt-6 border-t pt-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Customer Documents
                      </h4>

                      {docsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading
                          documents...
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* ── Personal Docs (always shown) ── */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Personal Documents
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                {
                                  label: "ID Copy",
                                  field: documents?.customer_id_copy,
                                  key: "customer_id_copy",
                                },
                                {
                                  label: "Husband ID",
                                  field: documents?.husband_id_copy,
                                  key: "husband_id_copy",
                                },
                                {
                                  label: "Marriage Certificate",
                                  field: documents?.marriage_certificate,
                                  key: "marriage_certificate",
                                },
                                {
                                  label: "Billing Proof",
                                  field: documents?.billing_proof,
                                  key: "billing_proof",
                                },
                              ].map(({ label, field, key }) => {
                                const sourceLoanCode =
                                  docFileSources[key] ?? documents?.loan_code;
                                return (
                                  <div
                                    key={label}
                                    className="border rounded-lg p-3 flex flex-col items-center gap-2 bg-gray-50"
                                  >
                                    <p className="text-xs font-medium text-gray-600 text-center">
                                      {label}
                                    </p>
                                    {field ? (
                                      <div className="flex flex-col gap-1 w-full">
                                        {/\.(jpg|jpeg|png)$/i.test(field) && (
                                          <img
                                            src={`${API_BASE_URL}/api/customers/documents/file/${sourceLoanCode}/${field}`}
                                            alt={label}
                                            className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition"
                                            onClick={() =>
                                              setPreviewDoc(
                                                `${API_BASE_URL}/api/customers/documents/file/${sourceLoanCode}/${field}`,
                                              )
                                            }
                                          />
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-xs gap-1"
                                          onClick={() =>
                                            window.open(
                                              `${API_BASE_URL}/api/customers/documents/file/${sourceLoanCode}/${field}`,
                                              "_blank",
                                            )
                                          }
                                        >
                                          <Eye className="w-3 h-3" />
                                          {/\.pdf$/i.test(field)
                                            ? "View PDF"
                                            : "View"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1 text-gray-300">
                                        <XCircle className="w-6 h-6" />
                                        <span className="text-xs">
                                          Not uploaded
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* ── Loan Docs (only for Business Loan) ── */}
                          {customer &&
                            parseInt(customer.ccode, 10) >= 300 &&
                            documents && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                  Loan Documents
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                  {[
                                    {
                                      label: "App Form",
                                      field: documents.application_form,
                                      key: "application_form",
                                    },
                                    {
                                      label: "App Form (Page 2)",
                                      field: documents.application_form_2,
                                      key: "application_form_2",
                                    },
                                    {
                                      label: "Loan Agreement",
                                      field: documents.loan_agreement,
                                      key: "loan_agreement",
                                    },
                                    {
                                      label: "Loan Agreement (2)",
                                      field: documents.loan_agreement_2,
                                      key: "loan_agreement_2",
                                    },
                                    {
                                      label: "Promissory Note",
                                      field: documents.promissory_note,
                                      key: "promissory_note",
                                    },
                                    {
                                      label: "Bank Passbook",
                                      field: documents.bank_passbook,
                                      key: "bank_passbook",
                                    },
                                    {
                                      label: "Budget Report",
                                      field: documents.budget_report,
                                      key: "budget_report",
                                    },
                                  ].map(({ label, field, key }) => {
                                    const sourceLoanCode =
                                      docFileSources[key] ??
                                      documents.loan_code;
                                    return (
                                      <div
                                        key={label}
                                        className="border rounded-lg p-3 flex flex-col items-center gap-2 bg-gray-50"
                                      >
                                        <p className="text-xs font-medium text-gray-600 text-center leading-tight">
                                          {label}
                                        </p>
                                        {field ? (
                                          <div className="flex flex-col gap-1 w-full">
                                            {/\.(jpg|jpeg|png)$/i.test(
                                              field,
                                            ) && (
                                              <img
                                                src={`${API_BASE_URL}/api/customers/documents/file/${sourceLoanCode}/${field}`}
                                                alt={label}
                                                className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition"
                                                onClick={() =>
                                                  setPreviewDoc(
                                                    `${API_BASE_URL}/api/customers/documents/file/${sourceLoanCode}/${field}`,
                                                  )
                                                }
                                              />
                                            )}
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full text-xs gap-1"
                                              onClick={() =>
                                                window.open(
                                                  `${API_BASE_URL}/api/customers/documents/file/${sourceLoanCode}/${field}`,
                                                  "_blank",
                                                )
                                              }
                                            >
                                              <Eye className="w-3 h-3" />
                                              {/\.pdf$/i.test(field)
                                                ? "View PDF"
                                                : "View"}
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center gap-1 text-gray-300">
                                            <XCircle className="w-6 h-6" />
                                            <span className="text-xs">
                                              Not uploaded
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          {/* ── Death Settlement Documents ── */}
                          {deathSettlements.length > 0 &&
                            (() => {
                              const ds = deathSettlements[0];
                              const getDeathDocUrl = (
                                field: string,
                                isSlip = false,
                              ) =>
                                isSlip
                                  ? `${API_BASE_URL}/uploads/donation_slips/${field}`
                                  : `${API_BASE_URL}/${field}`;

                              const deathDocs = [
                                {
                                  label: "Marriage Certificate",
                                  field: ds.marriage_certificate,
                                  isSlip: false,
                                },
                                {
                                  label: "Bank Passbook",
                                  field: ds.bank_passbook,
                                  isSlip: false,
                                },
                                {
                                  label: "Death Certificate",
                                  field: ds.death_certificate,
                                  isSlip: false,
                                },
                                {
                                  label: "Donation Request",
                                  field: ds.donation_request_letter,
                                  isSlip: false,
                                },
                                {
                                  label: "Donation Slip",
                                  field: ds.donation_slip,
                                  isSlip: true,
                                },
                              ];
                              return (
                                <div className="mt-4">
                                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Death
                                    Settlement Documents
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {deathDocs.map(
                                      ({ label, field, isSlip }) => (
                                        <div
                                          key={label}
                                          className="border border-red-200 rounded-lg p-3 flex flex-col items-center gap-2 bg-red-50"
                                        >
                                          <p className="text-xs font-medium text-gray-600 text-center">
                                            {label}
                                          </p>
                                          {field ? (
                                            <div className="flex flex-col gap-1 w-full">
                                              {/\.(jpg|jpeg|png)$/i.test(
                                                field,
                                              ) && (
                                                <img
                                                  src={getDeathDocUrl(
                                                    field,
                                                    isSlip,
                                                  )}
                                                  alt={label}
                                                  className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition"
                                                  onClick={() =>
                                                    window.open(
                                                      getDeathDocUrl(
                                                        field,
                                                        isSlip,
                                                      ),
                                                      "_blank",
                                                    )
                                                  }
                                                />
                                              )}
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs gap-1 border-red-300 text-red-700 hover:bg-red-100"
                                                onClick={() =>
                                                  window.open(
                                                    getDeathDocUrl(
                                                      field,
                                                      isSlip,
                                                    ),
                                                    "_blank",
                                                  )
                                                }
                                              >
                                                <Eye className="w-3 h-3" />
                                                {/\.pdf$/i.test(field)
                                                  ? "View PDF"
                                                  : "View"}
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center gap-1 text-gray-300">
                                              <XCircle className="w-6 h-6" />
                                              <span className="text-xs">
                                                Not uploaded
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── LOANS TAB ─────────────────────────────────────────────── */}
              <TabsContent value="loans" className="space-y-4">
                {loans.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-8 text-center text-gray-500">
                      No loan history found
                    </CardContent>
                  </Card>
                ) : (
                  loans.map((loan) => {
                    const loanPayments = paymentsFor(loan.loan_code);
                    const paidAmt =
                      Number(loan.full_loan) - Number(loan.loan_balance);
                    const isExpanded = expandedLoans.includes(loan.loan_code);

                    return (
                      <Card
                        key={loan.loan_code}
                        className="border-0 shadow-lg overflow-hidden"
                      >
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-primary" />
                              <div>
                                <p className="text-base font-bold font-mono">
                                  {loan.loan_code}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {loan.loan_category || loan.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <LoanBadge balance={loan.loan_balance} />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleLoan(loan.loan_code)}
                                className="gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" /> Hide
                                    Payments
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" /> View
                                    Payments
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <Label className="text-xs text-gray-500">
                                Loan Amount
                              </Label>
                              <p className="text-sm font-bold text-primary">
                                {fmt(loan.loan_amount)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Full Loan
                              </Label>
                              <p className="text-sm text-gray-700">
                                {fmt(loan.full_loan)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Balance
                              </Label>
                              <p className="text-sm font-medium text-amber-600">
                                {fmt(loan.loan_balance)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                {loan.loan_category === "Daily Loan"
                                  ? "Daily Payment"
                                  : "Weekly Payment"}
                              </Label>
                              <p className="text-sm text-gray-700">
                                {fmt(loan.week_payment)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Loan Date
                              </Label>
                              <p className="text-sm text-gray-700">
                                {dateStr(loan.loan_date)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Due Date
                              </Label>
                              <p className="text-sm text-gray-700">
                                {dateStr(loan.due_date)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Document Fee
                              </Label>
                              <p className="text-sm text-gray-700">
                                {fmt(loan.document_fee)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Insurance Fee
                              </Label>
                              <p className="text-sm text-gray-700">
                                {fmt(loan.insurance_fee)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Business Type
                              </Label>
                              <p className="text-sm text-gray-700">
                                {loan.business_type}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <CardHeader className="col-span-full p-0 mb-0">
                              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <House className="w-4 h-4 text-primary" />
                                Bank Information
                              </h3>
                            </CardHeader>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Bank Name
                              </Label>
                              <p className="text-sm text-gray-700">
                                {loan.bank}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Account Type
                              </Label>
                              <p className="text-sm text-gray-700">
                                {loan.account_type}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">
                                Account No
                              </Label>
                              <p className="text-sm text-gray-700">
                                {loan.account_no}
                              </p>
                            </div>
                          </div>
                          {/* Progress */}
                          {Number(loan.full_loan) > 0 && (
                            <div className="space-y-1 mb-4">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Repayment Progress</span>
                                <span>
                                  {(
                                    (paidAmt / Number(loan.full_loan)) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <Progress
                                value={(paidAmt / Number(loan.full_loan)) * 100}
                                className="h-1.5"
                              />
                            </div>
                          )}

                          {isExpanded && (
                            <div className="mt-4 border-t pt-4 space-y-4">
                              {/* ── Loan Documents ── */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-primary" />
                                  Loan Documents
                                </h4>

                                {!loanDocuments[loan.loan_code] ? (
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                    Loading documents...
                                  </div>
                                ) : (
                                  (() => {
                                    const doc = loanDocuments[loan.loan_code];
                                    const isBusinessLoan =
                                      loan.loan_category === "Business Loan" ||
                                      loan.loan_category === "Daily Loan";

                                    const businessDocs = [
                                      {
                                        label: "App Form",
                                        field: doc.application_form,
                                      },
                                      {
                                        label: "App Form (Page 2)",
                                        field: doc.application_form_2,
                                      },
                                      {
                                        label: "Loan Agreement",
                                        field: doc.loan_agreement,
                                      },
                                      {
                                        label: "Loan Agreement (2)",
                                        field: doc.loan_agreement_2,
                                      },
                                      {
                                        label: "Promissory Note",
                                        field: doc.promissory_note,
                                      },
                                      {
                                        label: "Bank Passbook",
                                        field: doc.bank_passbook,
                                      },
                                      {
                                        label: "Budget Report",
                                        field: doc.budget_report,
                                      },
                                      {
                                        label: "Transfer Receipt",
                                        field: doc.transfer_receipt,
                                      },
                                    ];

                                    const otherDocs = [
                                      {
                                        label: "App Form",
                                        field: doc.application_form,
                                      },
                                      {
                                        label: "App Form (Page 2)",
                                        field: doc.application_form_2,
                                      },
                                      {
                                        label: "Loan Agreement",
                                        field: doc.loan_agreement,
                                      },
                                      {
                                        label: "Loan Agreement (2)",
                                        field: doc.loan_agreement_2,
                                      },
                                      {
                                        label: "Promissory Note",
                                        field: doc.promissory_note,
                                      },
                                      {
                                        label: "Bank Passbook",
                                        field: doc.bank_passbook,
                                      },
                                    ];

                                    // For non-business loans show only docs that exist
                                    const docsToShow = isBusinessLoan
                                      ? businessDocs
                                      : otherDocs.filter((d) => d.field);

                                    if (docsToShow.length === 0) {
                                      return (
                                        <p className="text-sm text-gray-400">
                                          No documents uploaded
                                        </p>
                                      );
                                    }

                                    return (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                        {docsToShow.map(({ label, field }) => (
                                          <div
                                            key={label}
                                            className="border rounded-lg p-2 flex flex-col items-center gap-2 bg-gray-50"
                                          >
                                            <p className="text-xs font-medium text-gray-600 text-center leading-tight">
                                              {label}
                                            </p>
                                            {field ? (
                                              <div className="flex flex-col gap-1 w-full">
                                                {/\.(jpg|jpeg|png)$/i.test(
                                                  field,
                                                ) && (
                                                  <img
                                                    src={`${API_BASE_URL}/api/customers/documents/file/${doc.loan_code}/${field}`}
                                                    alt={label}
                                                    className="w-full h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition"
                                                    onClick={() =>
                                                      setPreviewDoc(
                                                        `${API_BASE_URL}/api/customers/documents/file/${doc.loan_code}/${field}`,
                                                      )
                                                    }
                                                  />
                                                )}
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="w-full text-xs gap-1 h-7"
                                                  onClick={() =>
                                                    window.open(
                                                      `${API_BASE_URL}/api/customers/documents/file/${doc.loan_code}/${field}`,
                                                      "_blank",
                                                    )
                                                  }
                                                >
                                                  <Eye className="w-3 h-3" />
                                                  {/\.pdf$/i.test(field)
                                                    ? "PDF"
                                                    : "View"}
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-center gap-1 text-gray-300">
                                                <XCircle className="w-5 h-5" />
                                                <span className="text-xs">
                                                  None
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()
                                )}
                              </div>

                              {/* ── Payment History ── */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  Payment History ({loanPayments.length}{" "}
                                  records)
                                </h4>
                                {loanPayments.length === 0 ? (
                                  <p className="text-sm text-gray-400 text-center py-4">
                                    No payments recorded
                                  </p>
                                ) : (
                                  <ScrollArea className="w-full">
                                    <div className="min-w-[500px]">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-gray-50">
                                            <TableHead className="text-xs">
                                              Date
                                            </TableHead>
                                            <TableHead className="text-xs">
                                              Week
                                            </TableHead>
                                            <TableHead className="text-xs text-right">
                                              Amount
                                            </TableHead>
                                            <TableHead className="text-xs">
                                              Method
                                            </TableHead>
                                            <TableHead className="text-xs">
                                              Slip
                                            </TableHead>
                                            <TableHead className="text-xs">
                                              Added By
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {loanPayments.map((p) => (
                                            <TableRow key={p.id}>
                                              <TableCell className="text-xs">
                                                {dateStr(p.date)}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {p.week_number}
                                              </TableCell>
                                              <TableCell className="text-xs font-medium text-right">
                                                {fmt(p.amount)}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                <PaymentMethodBadge
                                                  method={
                                                    p.arriarse === "Cheque"
                                                      ? "Cheque"
                                                      : p.payment_method
                                                  }
                                                  cdkNumber={p.cdk_number}
                                                />
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {p.slip_path ? (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-xs px-2 gap-1"
                                                    onClick={() =>
                                                      setPreviewDoc(
                                                        `${API_BASE_URL}/${p.slip_path}`,
                                                      )
                                                    }
                                                  >
                                                    <Eye className="w-3 h-3" />{" "}
                                                    Slip
                                                  </Button>
                                                ) : (
                                                  <span className="text-gray-400">
                                                    —
                                                  </span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs">
                                                {p.added_by || "—"}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
              {/* ── RECOVERY STATUS TAB ── */}
              <TabsContent value="recovery">
                {activeLoan ? (
                  <RecoveryStatus
                    loan_code={activeLoan.loan_code}
                    customer_code={customer.customer_code}
                  />
                ) : loans.length > 0 ? (
                  // Show recovery for most recent loan even if completed
                  <RecoveryStatus
                    loan_code={loans[0].loan_code}
                    customer_code={customer.customer_code}
                  />
                ) : (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="py-10 text-center text-gray-500">
                      No loan found to check recovery status
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              {/* ── CUSTOMER CHARGES TAB ──────────────────────────────────── */}
              <TabsContent value="charges" className="space-y-6">
                {/* Charges List Card */}
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Receipt size={20} className="text-primary" />
                        Customer Charges
                      </CardTitle>
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        Total: {fmt(totalCharges)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {chargesLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : customerCharges.length === 0 ? (
                      <p className="text-center text-gray-500 py-10">
                        No charges recorded for this customer
                      </p>
                    ) : (
                      <ScrollArea className="w-full">
                        <div className="min-w-[700px]">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">
                                  Loan Code
                                </TableHead>
                                <TableHead className="text-xs">
                                  Charge Type
                                </TableHead>
                                <TableHead className="text-xs">Note</TableHead>
                                <TableHead className="text-xs text-right">
                                  Amount
                                </TableHead>
                                <TableHead className="text-xs">
                                  Added By
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerCharges.map((c) => (
                                <TableRow
                                  key={c.id}
                                  className="hover:bg-gray-50"
                                >
                                  <TableCell className="text-xs">
                                    {dateStr(c.date)}
                                  </TableCell>
                                  <TableCell className="text-xs font-mono">
                                    {c.loan_code}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <Badge
                                      className={
                                        c.charge_type === "Legal Charge"
                                          ? "bg-red-100 text-red-700 border-0 text-xs"
                                          : "bg-blue-100 text-blue-700 border-0 text-xs"
                                      }
                                    >
                                      {c.charge_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-500">
                                    {c.note || "—"}
                                  </TableCell>
                                  <TableCell className="text-xs font-semibold text-right text-amber-700">
                                    {fmt(c.charge)}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {c.added_by || "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Add Legal Charge Card */}
                {/* Add Legal Charge Card — Admin only */}
                {user?.status === "admin" && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-transparent border-b border-gray-100">
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-700">
                        <Receipt className="w-4 h-4 text-red-500" />
                        Add Legal Charge
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {chargeError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {chargeError}
                        </div>
                      )}
                      {chargeSuccess && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                          {chargeSuccess}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Loan Code
                          </Label>
                          <select
                            value={newChargeLoanCode}
                            onChange={(e) =>
                              setNewChargeLoanCode(e.target.value)
                            }
                            className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
                          >
                            <option value="">Select loan code</option>
                            {loans.map((l) => (
                              <option key={l.loan_code} value={l.loan_code}>
                                {l.loan_code}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Charge Amount
                          </Label>
                          <Input
                            type="number"
                            value={newChargeAmount}
                            onChange={(e) => setNewChargeAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-11 bg-white border-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Note (optional)
                          </Label>
                          <Input
                            value={newChargeNote}
                            onChange={(e) => setNewChargeNote(e.target.value)}
                            placeholder="e.g. Court filing fee"
                            className="h-11 bg-white border-gray-200"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleAddLegalCharge}
                        disabled={addingCharge}
                        className="mt-4 gap-2 bg-red-600 hover:bg-red-700"
                      >
                        {addingCharge ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4" />
                        )}
                        Add Legal Charge
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              {/* ── ALL PAYMENTS TAB ──────────────────────────────────────── */}
              <TabsContent value="payments">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <DollarSign size={20} className="text-primary" />
                        All Payment History
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Printer className="w-4 h-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {payments.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        No payment records found
                      </p>
                    ) : (
                      <>
                        <ScrollArea className="w-full">
                          <div className="min-w-[700px]">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="font-semibold">
                                    Date
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Loan Code
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Week
                                  </TableHead>
                                  <TableHead className="font-semibold text-right">
                                    Amount
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Method
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Slip
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Center
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Branch
                                  </TableHead>
                                  <TableHead className="font-semibold">
                                    Added By
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {payments.map((p) => (
                                  <TableRow
                                    key={p.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <TableCell className="text-sm">
                                      {dateStr(p.date)}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono">
                                      {p.loan_code}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {p.week_number}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-right">
                                      {fmt(p.amount)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      <PaymentMethodBadge
                                        method={
                                          p.arriarse === "Cheque"
                                            ? "Cheque"
                                            : p.payment_method
                                        }
                                        cdkNumber={p.cdk_number}
                                      />
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {p.slip_path ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-xs px-2 gap-1"
                                          onClick={() =>
                                            setPreviewDoc(
                                              `${API_BASE_URL}/${p.slip_path}`,
                                            )
                                          }
                                        >
                                          <Eye className="w-3 h-3" /> View Slip
                                        </Button>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {p.center}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {p.bname}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {p.added_by || "—"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </ScrollArea>

                        {/* Summary Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600">
                                Total Paid:
                              </span>
                              <span className="text-lg font-bold text-primary">
                                {fmt(
                                  payments.reduce(
                                    (s, p) => s + Number(p.amount),
                                    0,
                                  ),
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600">
                                Transactions:
                              </span>
                              <span className="text-lg font-bold text-gray-800">
                                {payments.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
        {/* Document Preview Modal */}
        {previewDoc && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewDoc(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <p className="font-semibold text-gray-800">Document Preview</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(previewDoc, "_blank")}
                    className="gap-1"
                  >
                    <Download className="w-4 h-4" /> Open in Tab
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewDoc(null)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {/\.pdf$/i.test(previewDoc) ? (
                  <iframe
                    src={previewDoc}
                    className="w-full h-[70vh] rounded"
                  />
                ) : (
                  <img
                    src={previewDoc}
                    alt="Document"
                    className="w-full rounded object-contain max-h-[70vh]"
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {/* Empty State */}
        {!customerFound && !isSearching && !searchError && (
          <Card className="border-0 shadow-lg  mx-auto">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Search for a customer
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Enter Customer Code, Loan Code, or NIC to view payment history
                  and loan details
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
