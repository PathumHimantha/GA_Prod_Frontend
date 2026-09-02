import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Calendar,
  Building2,
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  UserCircle,
  AlertCircle,
  Banknote,
  FileText,
  ExternalLink,
} from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { API_BASE_URL } from "@/apiConfig";
const ALL = "__all__"; // sentinel — Radix Select forbids value=""

// ── Types ─────────────────────────────────────────────────────────────────────
interface PaymentRow {
  nic: string;
  customer_code: string;
  id: number;
  loan_code: string;
  name: string;
  cname: string;
  center: string;
  bname: string;
  group: string;
  payment: number;
  payment_date: string;
  week_number: number;
  payment_method: string;
}
interface LoanRow {
  customer_code: string;
  loan_code: string;
  loan_amount: number;
  full_loan: number;
  week_payment: number;
  cname: string;
  name: string;
  address: string;
  center: string;
  bname: string;
  group: string;
  type: string;
  loan_date: string;
}
interface Summary {
  totalCollected: number;
  totalNewLoan: number;
  totalRenewLoan: number;
  paymentCount: number;
  loanCount: number;
  uniqueCenters: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `Rs. ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().split("T")[0];

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = String(item[key] || "Unknown");
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const CenterPayments = () => {
  const { user } = useAuth();
  // Add with other state:
  const [targetCenter, setTargetCenter] = useState<string | null>(null);
  const centerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Role flags — defined FIRST so useState initialisers can use them
  const isExecutive =
    user?.status === "executive" || user?.status === "manager";
  const isBranchManager = user?.status === "branch_manager";

  const isKegalleUser = isExecutive && user?.bname?.toUpperCase() === "KEGALLE";

  // KEGALLE executives get the dropdown (KEGALLE + NARAMMALA); other executives stay locked
  const isBranchLocked = isExecutive && !isKegalleUser;

  // Filter state
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedBranch, setSelectedBranch] = useState(
    isBranchLocked
      ? user?.bname || ALL
      : isKegalleUser
        ? user?.bname || ALL
        : ALL,
  );
  const [selectedExec, setSelectedExec] = useState(
    isExecutive ? user?.name || ALL : ALL,
  );

  // Data state
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [newLoans, setNewLoans] = useState<LoanRow[]>([]);
  const [executives, setExecutives] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropLoading, setDropLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const duplicatePaymentIds = findDuplicatePaymentIds(payments);
  // Add this with your other state declarations
  const [branchOptions, setBranchOptions] = useState<
    { label: string; value: string; sub?: string }[]
  >([]);
  // Collapsed centers
  const [collapsedCenters, setCollapsedCenters] = useState<Set<string>>(
    new Set(),
  );
  const toggleCenter = (key: string) =>
    setCollapsedCenters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  // Add AFTER the existing state declarations, BEFORE the existing useEffects:
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlDate = params.get("date");
    const urlBranch = params.get("branch");
    const urlExec = params.get("exec");
    const urlCenter = params.get("center");

    if (urlDate) setSelectedDate(urlDate);
    if (urlBranch && !isBranchLocked) setSelectedBranch(urlBranch);
    if (urlExec && !isExecutive) setSelectedExec(urlExec);
    if (urlCenter) setTargetCenter(urlCenter);
  }, []); // eslint-disable-line
  // Add after the above useEffect:
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("date") && params.get("branch")) {
      // Wait one tick for state to settle then fetch
      const t = setTimeout(() => fetchData(), 100);
      return () => clearTimeout(t);
    }
  }, [selectedDate, selectedBranch, selectedExec]); // eslint-disable-line
  // Add after the above:
  useEffect(() => {
    if (!targetCenter || !hasSearched) return;
    const t = setTimeout(() => {
      const el = centerRefs.current[targetCenter];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [hasSearched, targetCenter]);
  // ── Load dropdowns on mount only (no data fetch) ──────────────────────────
  useEffect(() => {
    const load = async () => {
      setDropLoading(true);
      try {
        if (user) {
          const branchesData = await fetchBranches({
            role: user.status,
            userId: user.id.toString(),
            bname: user.bname,
          });
          console.log("[CenterPayments] fetchBranches result:", branchesData);
          console.log(
            "[CenterPayments] user.status:",
            user.status,
            "isBranchLocked:",
            isBranchLocked,
          );

          setBranchOptions([
            { label: "All Branches", value: ALL },
            ...branchesData.map((b) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ]);

          setBranches(branchesData.map((b) => b.bname));
        }

        const p = new URLSearchParams({
          date: todayISO(),
          role: user?.status || "",
          userid: user?.id?.toString() || "",
          bname: user?.bname || "",
          dropdown_only: "true",
        });
        const res = await fetch(
          `${API_BASE_URL}/api/customers/center_payments?${p}`,
        );
        const data = await res.json();
        if (data.executives) setExecutives(data.executives);
      } catch (_) {
      } finally {
        setDropLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line

  // ── Reload executives when branch changes ─────────────────────────────────
  useEffect(() => {
    if (isExecutive) return; // exec users are locked, skip
    setSelectedExec(ALL); // reset exec on branch change
    if (selectedBranch === ALL) return;
    const load = async () => {
      try {
        const p = new URLSearchParams({
          date: todayISO(),
          role: user?.status || "",
          userid: user?.id?.toString() || "",
          bname: user?.bname || "",
          selected_branch: selectedBranch,
          dropdown_only: "true",
        });
        const res = await fetch(
          `${API_BASE_URL}/api/customers/center_payments?${p}`,
        );
        const data = await res.json();
        if (data.executives) setExecutives(data.executives);
      } catch (_) {}
    };
    load();
  }, [selectedBranch]); // eslint-disable-line

  // ── Fetch data — only called by Search button ─────────────────────────────
  const fetchData = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({
        date: selectedDate,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        bname: user?.bname || "",
      });
      if (selectedBranch !== ALL) p.set("selected_branch", selectedBranch);
      if (selectedExec !== ALL) p.set("selected_name", selectedExec);

      const res = await fetch(
        `${API_BASE_URL}/api/customers/center_payments?${p}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");

      setPayments(data.payments || []);
      setNewLoans(data.newLoans || []);
      setSummary(data.summary || null);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranch, selectedExec, user]);

  // ── Grouped data ──────────────────────────────────────────────────────────
  const paymentsByCenter = groupBy(payments, "center");
  const loansByCenter = groupBy(newLoans, "center");
  const allCenters = [
    ...new Set([
      ...Object.keys(paymentsByCenter),
      ...Object.keys(loansByCenter),
    ]),
  ].sort();
  function findDuplicatePaymentIds(payments: PaymentRow[]): Set<number> {
    const seen = new Map<string, number[]>();
    payments.forEach((p) => {
      const key = `${p.loan_code}|${p.payment_date}|${p.week_number}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(p.id);
    });

    const duplicateIds = new Set<number>();
    seen.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => duplicateIds.add(id));
      }
    });
    return duplicateIds;
  }

  // Add this function before the return statement (after the findDuplicatePaymentIds function)
  function getPaymentMethodBadge(method: string) {
    const methods: Record<string, { label: string; className: string }> = {
      CDK: {
        label: "CDK",
        className: "bg-purple-100 text-purple-700 border-purple-200",
      },
      "Online Payment": {
        label: "Online Payment",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      "Bank Deposit": {
        label: "Bank Deposit",
        className: "bg-indigo-100 text-indigo-700 border-indigo-200",
      },
      Cash: {
        label: "Cash",
        className: "bg-green-100 text-green-700 border-green-200",
      },
      Cheque: {
        label: "Cheque",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
    };

    const normalizedMethod = method?.trim() || "Cash";
    const found = methods[normalizedMethod] || methods["Cash"];

    return found;
  }
  const openPaymentHistory = (customerCode: string) => {
    window.open(
      `/dashboard/payment-history?customer_code=${encodeURIComponent(customerCode)}`,
      "_blank",
    );
  };
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6  mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" /> Center Payments
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Daily collections and new loans grouped by center
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">
              {selectedDate}
            </span>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-lg mx-auto">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search size={18} className="text-primary" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-11 bg-white border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Branch
                </Label>
                {isBranchLocked ? (
                  <Input
                    value={user?.bname || ""}
                    readOnly
                    className="h-11 bg-gray-50 border-gray-200 text-gray-600"
                  />
                ) : (
                  <SearchableSelect
                    options={branchOptions}
                    value={selectedBranch}
                    onChange={(value) => setSelectedBranch(value)}
                    placeholder={
                      dropLoading ? "Loading..." : "Select branch..."
                    }
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <UserCircle className="w-3.5 h-3.5" /> Executive
                </Label>
                {isExecutive ? (
                  <Input
                    value={user?.name || ""}
                    readOnly
                    className="h-11 bg-gray-50 border-gray-200 text-gray-600"
                  />
                ) : (
                  <SearchableSelect
                    options={[
                      { label: "All Executives", value: ALL },
                      ...executives.map((e) => ({
                        label: e,
                        value: e,
                      })),
                    ]}
                    value={selectedExec}
                    onChange={(value) => setSelectedExec(value)}
                    placeholder="Select executive..."
                  />
                )}
              </div>

              {/* Search button */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 opacity-0">
                  Search
                </Label>
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  className="h-11 w-full gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2  mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6  mx-auto">
            {[
              {
                label: "Collected",
                value: fmt(summary.totalCollected),
                icon: DollarSign,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "Payments",
                value: summary.paymentCount,
                icon: CreditCard,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Centers",
                value: summary.uniqueCenters,
                icon: MapPin,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "New Loans",
                value: fmt(summary.totalNewLoan),
                icon: FileText,
                color: "text-primary",
                bg: "bg-primary/5",
              },
              {
                label: "Renewals",
                value: fmt(summary.totalRenewLoan),
                icon: RefreshCw,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                label: "Loan Records",
                value: summary.loanCount,
                icon: Users,
                color: "text-gray-600",
                bg: "bg-gray-100",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-0 shadow-md">
                <CardContent className="p-3">
                  <div
                    className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className={`text-base font-bold ${color} leading-tight`}>
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Center sections */}
        {!loading && hasSearched && (
          <div className="space-y-6  mx-auto">
            {allCenters.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">
                      No data found
                    </h3>
                    <p className="text-sm text-gray-500">
                      No payments or loans for the selected filters
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              allCenters.map((center) => {
                const isTarget = center === targetCenter;
                const centerPayments = paymentsByCenter[center] || [];
                const centerLoans = loansByCenter[center] || [];
                const isCollapsed = collapsedCenters.has(center);
                const paysByGroup = groupBy(centerPayments, "group");
                const loansByGroup = groupBy(centerLoans, "group");
                const allGroups = [
                  ...new Set([
                    ...Object.keys(paysByGroup),
                    ...Object.keys(loansByGroup),
                  ]),
                ].sort();
                const centerPayTotal = centerPayments.reduce(
                  (s, p) => s + Number(p.payment),
                  0,
                );
                const centerLoanTotal = centerLoans.reduce(
                  (s, l) => s + Number(l.loan_amount),
                  0,
                );

                return (
                  <div
                    key={center}
                    ref={(el) => {
                      centerRefs.current[center] = el;
                    }} // ← attach ref to wrapper div
                  >
                    <Card
                      className={`border-0 shadow-lg overflow-hidden transition-all duration-500 ${
                        isTarget
                          ? "ring-2 ring-primary shadow-primary/20 shadow-xl"
                          : ""
                      }`}
                    >
                      {/* Center header */}
                      <div
                        className={`px-5 py-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                          isTarget
                            ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
                            : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                        }`}
                        onClick={() => toggleCenter(center)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-gray-800">
                              {center}
                            </h2>
                            <p className="text-xs text-gray-500">
                              {centerPayments.length} payments ·{" "}
                              {centerLoans.length} loans
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex gap-4 text-right">
                            <div>
                              <p className="text-xs text-gray-500">Collected</p>
                              <p className="text-sm font-bold text-green-600">
                                {fmt(centerPayTotal)}
                              </p>
                            </div>
                            {centerLoanTotal > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Loans</p>
                                <p className="text-sm font-bold text-primary">
                                  {fmt(centerLoanTotal)}
                                </p>
                              </div>
                            )}
                          </div>
                          {isCollapsed ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <CardContent className="p-4 space-y-6">
                          {allGroups.map((group) => {
                            const grpPayments = paysByGroup[group] || [];
                            const grpLoans = loansByGroup[group] || [];
                            const grpPayTotal = grpPayments.reduce(
                              (s, p) => s + Number(p.payment),
                              0,
                            );
                            const grpLoanTotal = grpLoans.reduce(
                              (s, l) => s + Number(l.loan_amount),
                              0,
                            );

                            return (
                              <div key={group} className="space-y-4">
                                {/* Group label */}

                                {/* Collections */}
                                {grpPayments.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Banknote className="w-4 h-4 text-green-600" />
                                      <span className="text-sm font-semibold text-green-700">
                                        Collections ({grpPayments.length})
                                      </span>
                                    </div>
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                      <div className="w-full overflow-x-auto">
                                        <div className="min-w-[550px]">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-green-50/60">
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  #
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Loan Code
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Cusotmer Code
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Name
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  NIC
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Payment Method
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600 text-right">
                                                  Amount
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600 text-center">
                                                  Action
                                                </TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {grpPayments.map((p, idx) => {
                                                const isDuplicate =
                                                  duplicatePaymentIds.has(p.id);
                                                return (
                                                  <TableRow
                                                    key={p.id}
                                                    className={
                                                      isDuplicate
                                                        ? "bg-red-50 hover:bg-red-100 border-l-2 border-red-400"
                                                        : "hover:bg-gray-50"
                                                    }
                                                  >
                                                    <TableCell className="text-xs text-gray-400">
                                                      {idx + 1}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-gray-700">
                                                      {p.loan_code}
                                                      {isDuplicate && (
                                                        <Badge className="ml-2 bg-red-100 text-red-700 text-[10px] px-1 py-0">
                                                          Duplicate
                                                        </Badge>
                                                      )}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-gray-700">
                                                      {p.customer_code}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-700">
                                                      {p.cname}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-700">
                                                      {p.nic}
                                                    </TableCell>
                                                    <TableCell>
                                                      {(() => {
                                                        const badge =
                                                          getPaymentMethodBadge(
                                                            p.payment_method,
                                                          );
                                                        return (
                                                          <Badge
                                                            className={`${badge.className} text-xs px-2 py-0.5 border font-medium`}
                                                          >
                                                            {badge.label}
                                                          </Badge>
                                                        );
                                                      })()}
                                                    </TableCell>
                                                    <TableCell
                                                      className={`text-xs font-semibold text-right ${isDuplicate ? "text-red-700" : "text-green-700"}`}
                                                    >
                                                      {fmt(p.payment)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 gap-1 text-xs"
                                                        onClick={() =>
                                                          openPaymentHistory(
                                                            p.customer_code,
                                                          )
                                                        }
                                                      >
                                                        <ExternalLink className="w-3 h-3" />
                                                        View
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                      <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-500">
                                          Group {group} Total
                                        </span>
                                        <span className="text-sm font-bold text-green-700">
                                          {fmt(grpPayTotal)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Loans */}
                                {grpLoans.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <CreditCard className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-semibold text-primary">
                                        New / Renewed Loans ({grpLoans.length})
                                      </span>
                                    </div>
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                      <ScrollArea className="w-full">
                                        <div className="min-w-[650px]">
                                          <Table>
                                            <TableHeader>
                                              <TableRow className="bg-blue-50/60">
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  #
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Customer
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Code
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600">
                                                  Type
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600 text-right">
                                                  Amount
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600 text-right">
                                                  Full Loan
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600 text-right">
                                                  Weekly
                                                </TableHead>
                                                <TableHead className="text-xs font-semibold text-gray-600 text-center">
                                                  Action
                                                </TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {grpLoans.map((l, idx) => (
                                                <TableRow
                                                  key={l.loan_code}
                                                  className="hover:bg-gray-50"
                                                >
                                                  <TableCell className="text-xs text-gray-400">
                                                    {idx + 1}
                                                  </TableCell>
                                                  <TableCell className="text-xs text-gray-700">
                                                    {l.cname || l.name}
                                                  </TableCell>
                                                  <TableCell className="text-xs font-mono text-gray-500">
                                                    {l.customer_code}
                                                  </TableCell>
                                                  <TableCell>
                                                    {l.type === "newloan" ? (
                                                      <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0">
                                                        New
                                                      </Badge>
                                                    ) : (
                                                      <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">
                                                        Renew
                                                      </Badge>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-xs font-semibold text-right text-primary">
                                                    {fmt(l.loan_amount)}
                                                  </TableCell>
                                                  <TableCell className="text-xs text-right text-gray-600">
                                                    {fmt(l.full_loan)}
                                                  </TableCell>
                                                  <TableCell className="text-xs text-right text-gray-600">
                                                    {fmt(l.week_payment)}
                                                  </TableCell>
                                                  <TableCell className="text-center">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 px-2 gap-1 text-xs"
                                                      onClick={() =>
                                                        openPaymentHistory(
                                                          l.customer_code,
                                                        )
                                                      }
                                                    >
                                                      <ExternalLink className="w-3 h-3" />
                                                      View
                                                    </Button>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </ScrollArea>
                                      <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-500">
                                          Group {group} Loans Total
                                        </span>
                                        <span className="text-sm font-bold text-primary">
                                          {fmt(grpLoanTotal)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Center totals */}
                          <div className="mt-2 pt-3 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-green-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-gray-500">
                                Total Collected
                              </p>
                              <p className="text-sm font-bold text-green-700 mt-0.5">
                                {fmt(centerPayTotal)}
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-gray-500">
                                Total Loans
                              </p>
                              <p className="text-sm font-bold text-primary mt-0.5">
                                {fmt(centerLoanTotal)}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                              <p className="text-xs text-gray-500">Records</p>
                              <p className="text-sm font-bold text-gray-700 mt-0.5">
                                {centerPayments.length} payments ·{" "}
                                {centerLoans.length} loans
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                );
              })
            )}

            {/* Grand total */}
            {allCenters.length > 0 && summary && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-blue-500/5">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Grand Total — {selectedDate}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total Collected</p>
                      <p className="text-lg font-bold text-green-600">
                        {fmt(summary.totalCollected)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">New Loans</p>
                      <p className="text-lg font-bold text-primary">
                        {fmt(summary.totalNewLoan)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Renewals</p>
                      <p className="text-lg font-bold text-amber-600">
                        {fmt(summary.totalRenewLoan)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Centers</p>
                      <p className="text-lg font-bold text-gray-700">
                        {summary.uniqueCenters}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasSearched && (
          <Card className="border-0 shadow-lg  mx-auto">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Select filters and search
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Choose a date, branch and executive then click Search to view
                  center-wise collections and loans
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CenterPayments;
