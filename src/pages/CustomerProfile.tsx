import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Building2,
  Hash,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Clock,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Skull,
  FileText,
  Heart,
  Receipt,
  X,
  Printer,
  Download,
  DollarSign,
  Activity,
  Users,
  Banknote,
  FileSpreadsheet,
  Gift,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoanStatementModal from "@/components/Loanstatementmodal";
import { API_BASE_URL } from "@/apiConfig";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
  customer_code: string;
  cname: string;
  nic: string;
  address: string;
  phone1: string;
  phone2?: string;
  center: string;
  ccode: string;
  group: string;
  bname: string;
  name: string; // executive
  loan_code: string;
  loan_amount: number;
  full_loan: number;
  loan_balance: number;
  week_payment: number;
  payment: number; // cumulative paid
  loan_date: string;
  due_date: string;
  type: string;
  loan_category?: string;
}

interface Guarantor {
  gname: string;
  gNic: string;
  gAddress: string;
  gPhone: string;
}

interface Payment {
  payment: number;
  payment_date: string;
  week_number: number;
  added_by: string;
}

interface DeathSettle {
  approved_by: string;
  payment: number;
  id: number;
  loan_code: string;
  amount?: number;
  settled_by?: string;
  created_at?: string;
  donation_amount?: string;
  donation_slip?: string;
  donation_added_by?: string;
  donation_added_at?: string;
  approval_status?: string;
  remarks?: string;
}

interface LoanHistory {
  loan_code: string;
  loan_date: string;
  full_loan: number;
  loan_balance: number;
  status: "Settled" | "Active";
  type: string;
}
interface LoanWithPayments {
  loan_code: string;
  loan_amount: string;
  loan_balance: string;
  loan_date: string;
  due_date: string;
  full_loan: string;
  week_payment: string;
  type: string;
  loan_category: string | null;
  period: string;
  interest: string;
  payments: Payment[];
}
interface SearchResult {
  customer: Customer;
  arrears: number;
  guarantors: Guarantor[];
  deathSettle: DeathSettle | null;
  payments: Payment[];
  loans: LoanWithPayments[]; // Add this to your API response
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `Rs. ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = ({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: any;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
    {Icon && (
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-sm text-slate-800 font-medium mt-0.5 ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  sub?: string;
}) => (
  <div className={`rounded-2xl p-4 border ${color}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" />
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
    </div>
    <p className="text-base font-bold leading-tight">{value}</p>
    {sub && <p className="text-[11px] opacity-60 mt-1">{sub}</p>}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const CustomerProfile = ({ initialSearch }: { initialSearch?: string }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGuarantors, setShowGuarantors] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithPayments | null>(
    null,
  );
  useEffect(() => {
    if (initialSearch?.trim()) {
      handleSearch(initialSearch.trim());
    }
  }, [initialSearch]);

  const handleSearch = async (overrideTerm?: string) => {
    const term = (overrideTerm ?? searchTerm).trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/profile/search-profile?term=${encodeURIComponent(term)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");

      setResult(data);
      setShowGuarantors(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const c = result?.customer;
  const loanBalance = Number(c?.loan_balance || 0);
  const fullLoan = Number(c?.full_loan || 0);
  const paidAmt = Number(c?.payment || 0);
  const progressPct =
    fullLoan > 0 ? Math.min(100, Math.round((paidAmt / fullLoan) * 100)) : 0;
  const isOverdue = c?.due_date
    ? c.due_date < new Date().toISOString().split("T")[0]
    : false;
  const isSettled = loanBalance === 0;

  // Filter loans for the loans section (excluding current loan)
  const previousLoans =
    result?.loans?.filter((loan) => loan.loan_code !== c?.loan_code) || [];

  return (
    <div className="space-y-5">
      {/* Loan Statement Modal */}
      {selectedLoan && (
        <LoanStatementModal
          isOpen={!!selectedLoan}
          onClose={() => setSelectedLoan(null)}
          loan={selectedLoan}
          customer={c!}
        />
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Result ── */}
      {result && c && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Death settlement section - Enhanced with donation details */}
          {result.deathSettle && (
            <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-600">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Skull className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-red-800">
                        Death Settlement
                      </h3>
                      <Badge className="bg-red-600 text-white border-0">
                        {result.deathSettle.approval_status || "Filed"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-red-600 mb-1">
                          Settlement Amount
                        </p>
                        <p className="text-lg font-bold text-red-700">
                          {fmt(result.deathSettle.payment || 0)}
                        </p>
                      </div>

                      {result.deathSettle.donation_amount && (
                        <div className="bg-white/50 rounded-lg p-3 border-l-4 border-l-green-500">
                          <div className="flex items-center gap-1 mb-1">
                            <Gift className="w-3 h-3 text-green-600" />
                            <p className="text-xs text-green-600">
                              Donation Amount
                            </p>
                          </div>
                          <p className="text-lg font-bold text-green-700">
                            {fmt(result.deathSettle.donation_amount)}
                          </p>
                          {result.deathSettle.donation_added_by && (
                            <p className="text-xs text-slate-500 mt-1">
                              Added by: {result.deathSettle.donation_added_by}{" "}
                              on {fmtDate(result.deathSettle.donation_added_at)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-red-600 mb-1">Settled By</p>
                        <p className="font-medium text-sm">
                          {result.deathSettle.settled_by ||
                            result.deathSettle.approved_by ||
                            "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {fmtDate(result.deathSettle.created_at)}
                        </p>
                      </div>
                    </div>

                    {result.deathSettle.remarks && (
                      <div className="mt-3 p-2 bg-white/50 rounded-lg text-sm">
                        <span className="text-xs text-red-600 block mb-1">
                          Remarks:
                        </span>
                        {result.deathSettle.remarks}
                      </div>
                    )}

                    {result.deathSettle.donation_slip && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Donation Slip
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header card */}
          <Card className="border-0 shadow-md overflow-hidden">
            <div
              className={`h-2 ${isSettled ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-primary"}`}
            />
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Avatar */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg
                  ${
                    isSettled
                      ? "bg-gradient-to-br from-green-400 to-green-600"
                      : isOverdue
                        ? "bg-gradient-to-br from-red-400 to-red-600"
                        : "bg-gradient-to-br from-primary/80 to-primary"
                  }`}
                >
                  {c.cname?.charAt(0)?.toUpperCase()}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-slate-800">
                      {c.cname}
                    </h2>
                    {isSettled ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200 border gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Settled
                      </Badge>
                    ) : isOverdue ? (
                      <Badge className="bg-red-50 text-red-700 border-red-200 border gap-1">
                        <AlertTriangle className="w-3 h-3" /> LAP / Overdue
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 border gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </Badge>
                    )}
                    {c.type && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {c.type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {c.customer_code}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {c.nic}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {c.bname}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {c.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {!isSettled && fullLoan > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Repayment progress</span>
                    <span className="font-semibold">{progressPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverdue ? "bg-red-500" : "bg-primary"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Paid: {fmt(paidAmt)}</span>
                    <span>Total: {fmt(fullLoan)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Loan Balance"
              value={fmt(loanBalance)}
              icon={TrendingDown}
              color={
                isSettled
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }
            />
            <StatCard
              label="Weekly Due"
              value={fmt(c.week_payment)}
              icon={Calendar}
              color="bg-blue-50 border-blue-200 text-blue-700"
            />
            <StatCard
              label="Arrears"
              value={fmt(result.arrears)}
              icon={AlertTriangle}
              color={
                result.arrears > 0
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-700"
              }
            />
            <StatCard
              label="Due Date"
              value={fmtDate(c.due_date)}
              icon={Clock}
              color={
                isOverdue
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }
              sub={isOverdue ? "Overdue" : "On track"}
            />
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Personal details */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-primary" /> Personal Details
                </h3>
                <InfoRow label="Full Name" value={c.cname} icon={User} />
                <InfoRow label="NIC" value={c.nic} icon={CreditCard} mono />
                <InfoRow label="Phone 1" value={c.phone1} icon={Phone} />
                {c.phone2 && (
                  <InfoRow label="Phone 2" value={c.phone2} icon={Phone} />
                )}
                <InfoRow label="Address" value={c.address} icon={MapPin} />
              </CardContent>
            </Card>

            {/* Loan details */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Loan
                  Details
                </h3>
                <InfoRow
                  label="Loan Code"
                  value={c.loan_code}
                  icon={Hash}
                  mono
                />
                <InfoRow
                  label="Loan Amount"
                  value={fmt(c.loan_amount)}
                  icon={CreditCard}
                />
                <InfoRow
                  label="Full Loan"
                  value={fmt(c.full_loan)}
                  icon={CreditCard}
                />
                <InfoRow
                  label="Loan Date"
                  value={fmtDate(c.loan_date)}
                  icon={Calendar}
                />
                <InfoRow label="Executive" value={c.name} icon={User} />
              </CardContent>
            </Card>

            {/* Center details */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Center
                  Details
                </h3>
                <InfoRow label="Center" value={c.center} icon={Building2} />
                <InfoRow label="Center Code" value={c.ccode} icon={Hash} mono />
                <InfoRow label="Group" value={c.group} icon={Shield} />
                <InfoRow label="Branch" value={c.bname} icon={Building2} />
              </CardContent>
            </Card>

            {/* Guarantors collapsible */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <button
                  onClick={() => setShowGuarantors((p) => !p)}
                  className="w-full flex items-center justify-between mb-3"
                >
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Guarantors
                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                      {result.guarantors.length}
                    </Badge>
                  </h3>
                  {showGuarantors ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showGuarantors &&
                  (result.guarantors.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No guarantors found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {result.guarantors.map((g, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <p className="text-sm font-semibold text-slate-800">
                            {g.gname}
                          </p>
                          <div className="mt-1.5 space-y-1">
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3" />
                              {g.gNic}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              {g.gPhone}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {g.gAddress}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                {!showGuarantors && result.guarantors.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Click to view {result.guarantors.length} guarantor(s)
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Loans Section - New */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">
                  Loan History
                </h3>
                <Badge className="bg-primary/10 text-primary border-0 ml-2">
                  Total: {result?.loans?.length || 1}
                </Badge>
              </div>
              {/* Current Loan */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">
                  CURRENT LOAN
                </p>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold">
                          {c.loan_code}
                        </span>
                        <Badge
                          className={
                            isSettled
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }
                        >
                          {isSettled ? "Settled" : "Active"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {c.type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                        <span>Date: {fmtDate(c.loan_date)}</span>
                        <span>Amount: {fmt(c.loan_amount)}</span>
                        <span>Full: {fmt(c.full_loan)}</span>
                        {!isSettled && (
                          <span>Balance: {fmt(c.loan_balance)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => {
                        const found = result?.loans?.find(
                          (l) => l.loan_code === c.loan_code,
                        );
                        if (found) setSelectedLoan(found);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Statement
                    </Button>
                  </div>
                </div>
              </div>

              {/* Previous Loans */}
              {previousLoans.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    PREVIOUS LOANS
                  </p>
                  <div className="space-y-2">
                    {previousLoans.map((loan, index) => {
                      const isLoanSettled = Number(loan.loan_balance) === 0;
                      return (
                        <div
                          key={index}
                          className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm">
                                  {loan.loan_code}
                                </span>
                                <Badge
                                  className={
                                    isLoanSettled
                                      ? "bg-green-100 text-green-700"
                                      : "bg-blue-100 text-blue-700"
                                  }
                                >
                                  {isLoanSettled ? "Settled" : "Active"}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="text-xs capitalize"
                                >
                                  {loan.type}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                                <span>Date: {fmtDate(loan.loan_date)}</span>
                                <span>Amount: {fmt(loan.loan_amount)}</span>
                                <span>Full: {fmt(loan.full_loan)}</span>
                                {!isLoanSettled && (
                                  <span>Balance: {fmt(loan.loan_balance)}</span>
                                )}
                                <span>{loan.payments.length} payments</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Statement
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            Search for a customer
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Enter a NIC number or Customer Code to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
