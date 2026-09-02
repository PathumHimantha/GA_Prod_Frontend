import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  Search,
  Calendar,
  Building2,
  UserCircle,
  AlertCircle,
  Download,
  TrendingDown,
  Banknote,
  Clock,
  MapPin,
} from "lucide-react";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { getActiveUsers, User } from "@/lib/userHelpers";

import { API_BASE_URL } from "@/apiConfig";
const ALL = "__all__";

// ── Types ────────────────────────────────────────────────────────────────────
interface ArrearsRecord {
  customer_code: string;
  cname: string;
  executive_name: string;
  center: string;
  day: string;
  ccode: string;
  bname: string;
  status: "LAP" | "Active";
  loan_amount: number;
  phone1: string;
  loan_balance: number;
  week_payment: number;
  today_payment: number;
  total_arrears: number;
  loan_code: string;
  ex_follow_up: boolean;
  mg_follow_up: boolean;
  reminder_letter_1: boolean;
  reminder_letter_2: boolean;
}

interface Summary {
  totalCustomers: number;
  totalWithArrears: number;
  totalWithoutArrears: number;
  totalArrearsAmount: number;
  totalLoanAmount: number;
  totalBalance: number;
  uniqueCenters: number;
  date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `Rs. ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const todayISO = () => new Date().toISOString().split("T")[0];
const dateStr = (d?: string | null) => (d ? d.slice(0, 10) : "—");

// ── Excel export ──────────────────────────────────────────────────────────────
function exportToExcel(records: ArrearsRecord[], selectedDate: string) {
  const headers = [
    "Customer Code",
    "Customer Name",
    "EX Name",
    "Center",
    "Center Day",
    "Center Code",
    "Branch",
    "Status",
    "Phone Number",
    "Loan Amount",
    "Loan Balance",
    "Week Payment",
    "Today Payment",
    "Total Arrears",
    "Loan Code",
    "EX Follow-up",
    "MG Follow-up",
    "Reminder Letter 1",
    "Reminder Letter 2",
  ];

  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = records.map((r) => [
    r.customer_code,
    r.cname,
    r.executive_name,
    r.center,
    r.day,
    r.ccode,
    r.bname,
    r.status,
    r.phone1 || "",
    Number(r.loan_amount).toFixed(2),
    Number(r.loan_balance).toFixed(2),
    Number(r.week_payment).toFixed(2),
    Number(r.today_payment).toFixed(2),
    Number(r.total_arrears).toFixed(2),
    r.loan_code,
    r.ex_follow_up ? "Yes" : "No",
    r.mg_follow_up ? "Yes" : "No",
    r.reminder_letter_1 ? "Yes" : "No",
    r.reminder_letter_2 ? "Yes" : "No",
  ]);

  // Totals row
  const totalRow = [
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    records.reduce((s, r) => s + Number(r.loan_amount), 0).toFixed(2),
    records.reduce((s, r) => s + Number(r.loan_balance), 0).toFixed(2),
    records.reduce((s, r) => s + Number(r.week_payment), 0).toFixed(2),
    records.reduce((s, r) => s + Number(r.today_payment), 0).toFixed(2),
    records.reduce((s, r) => s + Number(r.total_arrears), 0).toFixed(2),
    "",
    "",
    "",
    "",
    "",
  ];

  const csv =
    "\uFEFF" +
    [headers, ...rows, totalRow]
      .map((row) => row.map(esc).join(","))
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Arrears_Report_${selectedDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
const ArrearsReport = () => {
  const { user } = useAuth();

  const isExecutive = user?.status === "executive";
  const isBranchManager = user?.status === "branch_manager";

  const isKegalleUser = isExecutive && user?.bname?.toUpperCase() === "KEGALLE";

  // KEGALLE executives get the dropdown (KEGALLE + NARAMMALA); other executives stay locked
  const isBranchLocked = isExecutive && !isKegalleUser;

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedBranch, setSelectedBranch] = useState(
    isBranchLocked ? user?.bname || "" : isKegalleUser ? user?.bname || "" : "",
  );
  const [selectedExec, setSelectedExec] = useState(
    isExecutive ? user?.name || "" : "",
  );
  const [lapCustomer, setLapCustomer] = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [records, setRecords] = useState<ArrearsRecord[]>([]);
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [executiveOptions, setExecutiveOptions] = useState<SelectOption[]>([
    { label: "All Executives", value: "" },
  ]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropLoading, setDropLoading] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // ── Load branches on mount using branchHelpers ────────────────────────────
  useEffect(() => {
    const loadBranches = async () => {
      setDropLoading(true);
      try {
        if (user) {
          const branchesData = await fetchBranches({
            role: user.status,
            userId: user.id.toString(),
            bname: user.bname,
          });

          const options: SelectOption[] = isBranchManager
            ? branchesData.map((b: Branch) => ({
                label: b.bname,
                value: b.bname,
                sub: b.bcode,
              }))
            : [
                { label: "All Branches", value: ALL },
                ...branchesData.map((b: Branch) => ({
                  label: b.bname,
                  value: b.bname,
                  sub: b.bcode,
                })),
              ];
          setBranchOptions(options);

          // Default selection for branch_manager
          if (isBranchManager && !selectedBranch && branchesData.length > 0) {
            setSelectedBranch(user?.bname || branchesData[0].bname);
          }
        }
      } catch (error) {
        console.error("Error loading branches:", error);
      } finally {
        setDropLoading(false);
      }
    };

    loadBranches();
    // eslint-disable-next-line
  }, []);

  // ── Load all executives on mount ─────────────────────────────────────────
  useEffect(() => {
    const loadAllExecutives = async () => {
      setExecLoading(true);
      try {
        const users = await getActiveUsers();

        // Filter users with executive, manager, or branch_manager roles
        const execs = users
          .filter(
            (u) =>
              u.role === "executive" ||
              u.role === "manager" ||
              u.role === "branch_manager",
          )
          .map((u) => u.name)
          .sort();

        setExecutiveOptions([
          { label: "All Executives", value: "" },
          ...execs.map((e: string) => ({ label: e, value: e })),
        ]);
      } catch (error) {
        console.error("Error loading executives:", error);
      } finally {
        setExecLoading(false);
      }
    };

    loadAllExecutives();
  }, []);

  // ── Filter executives when branch changes ─────────────────────────────────
  useEffect(() => {
    const filterExecutivesByBranch = async () => {
      if (!selectedBranch || selectedBranch === ALL || isExecutive) {
        // If no branch selected, show all executives
        const users = await getActiveUsers();
        const execs = users
          .filter(
            (u) =>
              u.role === "executive" ||
              u.role === "manager" ||
              u.role === "branch_manager",
          )
          .map((u) => u.name)
          .sort();

        setExecutiveOptions([
          { label: "All Executives", value: "" },
          ...execs.map((e: string) => ({ label: e, value: e })),
        ]);
        return;
      }

      setExecLoading(true);
      try {
        const users = await getActiveUsers();

        // Filter executives by the selected branch
        const execs = users
          .filter(
            (u) =>
              (u.role === "executive" || u.role === "branch_manager") &&
              u.bname === selectedBranch,
          )
          .map((u) => u.name)
          .sort();

        setExecutiveOptions([
          { label: "All Executives", value: "" },
          ...execs.map((e: string) => ({ label: e, value: e })),
        ]);

        // Reset selected executive if it's not in the new list
        if (selectedExec && !execs.includes(selectedExec)) {
          setSelectedExec("");
        }
      } catch (error) {
        console.error("Error filtering executives by branch:", error);
      } finally {
        setExecLoading(false);
      }
    };

    filterExecutivesByBranch();
  }, [selectedBranch, isExecutive, selectedExec]);

  // ── Fetch report ──────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        bname: user?.bname || "",
        lap_customer: lapCustomer ? "1" : "0",
      });

      if (selectedBranch && selectedBranch !== ALL) {
        params.set("selected_branch", selectedBranch);
      }

      if (selectedExec) {
        params.set("selected_name", selectedExec);
      }

      const res = await fetch(
        `${API_BASE_URL}/api/report/get_arrears_report?${params}`,
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch");

      setRecords(data.records || []);
      setSummary(data.summary || null);

      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranch, selectedExec, lapCustomer, user]);

  // ── Column totals ─────────────────────────────────────────────────────────
  const totalLoanAmt = records.reduce((s, r) => s + Number(r.loan_amount), 0);
  const totalBalance = records.reduce((s, r) => s + Number(r.loan_balance), 0);
  const totalWeekly = records.reduce((s, r) => s + Number(r.week_payment), 0);
  const totalTodayPayment = records.reduce(
    (s, r) => s + Number(r.today_payment),
    0,
  );
  const totalArrears = records.reduce((s, r) => s + Number(r.total_arrears), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-500" />
              Arrears Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Customers with arrears and outstanding payments
            </p>
          </div>
          {summary && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                {summary.date}
              </span>
            </div>
          )}
        </div>

        {/* Filters Card */}
        <Card className="mb-6 border-0 shadow-lg mx-auto">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search size={18} className="text-primary" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Report Date
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-11 bg-white border-gray-200"
                />
              </div>

              {/* Branch — searchable with codes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Branch
                </Label>
                {isBranchLocked ? (
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={user?.bname || ""}
                      readOnly
                      className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-600"
                    />
                  </div>
                ) : (
                  <SearchableSelect
                    options={branchOptions}
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    placeholder={
                      dropLoading ? "Loading branches..." : "All Branches"
                    }
                    disabled={dropLoading}
                  />
                )}
              </div>

              {/* Executive — searchable with branch filtering */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <UserCircle className="w-3.5 h-3.5" /> Executive
                </Label>
                {isExecutive ? (
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={user?.name || ""}
                      readOnly
                      className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-600"
                    />
                  </div>
                ) : (
                  <SearchableSelect
                    options={executiveOptions}
                    value={selectedExec}
                    onChange={setSelectedExec}
                    placeholder={
                      execLoading ? "Loading executives..." : "All Executives"
                    }
                    disabled={execLoading}
                  />
                )}
                {selectedBranch && selectedBranch !== ALL && !isExecutive && (
                  <p className="text-xs text-gray-500">
                    Showing executives for {selectedBranch}
                  </p>
                )}
              </div>

              {/* LAP Customer toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  LAP Customers
                </Label>
                <button
                  type="button"
                  onClick={() => setLapCustomer((p) => !p)}
                  className={`h-11 w-full flex items-center gap-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    lapCustomer
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      lapCustomer
                        ? "bg-primary border-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {lapCustomer && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  Include LAP Customers
                </button>
              </div>

              {/* Generate */}
              <div className="space-y-2 lg:col-start-4">
                <Label className="text-sm font-semibold text-gray-700 opacity-0">
                  Generate
                </Label>
                <Button
                  onClick={fetchReport}
                  disabled={loading}
                  className="h-11 w-full gap-2 bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && (
          <div className="space-y-4 mx-auto">
            {/* Summary + Download header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {summary && (
                <div className="flex flex-wrap gap-3">
                  {[
                    {
                      label: "With Arrears",
                      value: summary.totalWithArrears,
                      icon: Clock,
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                    },
                    {
                      label: "Arrears Amount",
                      value: fmt(summary.totalArrearsAmount),
                      icon: TrendingDown,
                      color: "text-orange-600",
                      bg: "bg-orange-50",
                    },
                    {
                      label: "Total Balance",
                      value: fmt(summary.totalBalance),
                      icon: Banknote,
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                    },
                    {
                      label: "Centers",
                      value: summary.uniqueCenters,
                      icon: MapPin,
                      color: "text-purple-600",
                      bg: "bg-purple-50",
                    },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bg}`}
                    >
                      <Icon className={`w-4 h-4 ${color}`} />
                      <div>
                        <p className="text-xs text-gray-500 leading-none">
                          {label}
                        </p>
                        <p className={`text-sm font-bold ${color} mt-0.5`}>
                          {typeof value === "number" && label.includes("Amt")
                            ? fmt(value)
                            : value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {records.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50 shrink-0"
                  onClick={() => exportToExcel(records, selectedDate)}
                >
                  <Download className="w-4 h-4" />
                  Download Excel
                </Button>
              )}
            </div>

            {/* Table Card */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 py-3 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Customers with Arrears
                  </CardTitle>
                  <Badge className="bg-amber-100 text-amber-700 border-0">
                    {records.length} customers
                  </Badge>
                </div>
              </CardHeader>

              {records.length === 0 ? (
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="w-7 h-7 text-green-500" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">
                      No customers with arrears found!
                    </p>
                    <p className="text-sm text-gray-400">
                      All customers are up to date with payments.
                    </p>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[1200px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            {[
                              "Customer Code",
                              "Customer Name",
                              "EX Name",
                              "Center",
                              "Center Day",
                              "Center Code",
                              "Branch",
                              "Status",
                              "Phone",
                              "Loan Amount",
                              "Loan Balance",
                              "Week Payment",
                              "Today Payment",
                              "Total Arrears",
                              "Loan Code",
                              "Ex Follow Up",
                              "Mg Follow Up",
                              "Reminder 1",
                              "Reminder 2",
                            ].map((h) => (
                              <TableHead
                                key={h}
                                className={`text-xs font-semibold text-gray-600 whitespace-nowrap ${
                                  h === "Total Arrears"
                                    ? "bg-amber-100 text-amber-700"
                                    : ""
                                }`}
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((r, idx) => (
                            <TableRow
                              key={`${r.loan_code}-${idx}`}
                              className="hover:bg-amber-50/20"
                            >
                              <TableCell className="text-xs font-mono text-gray-700 whitespace-nowrap">
                                {r.customer_code}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-gray-800 whitespace-nowrap">
                                {r.cname}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                                {r.executive_name}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                                {r.center}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                                {r.day}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-gray-500 whitespace-nowrap">
                                {r.ccode}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                                {r.bname}
                              </TableCell>
                              <TableCell>
                                {r.status === "LAP" ? (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    LAP
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    Active
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                                {r.phone1 || "—"} {/* ← Add this cell */}
                              </TableCell>
                              <TableCell className="text-xs text-right text-gray-700 whitespace-nowrap">
                                {fmt(r.loan_amount)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-amber-600 whitespace-nowrap">
                                {fmt(r.loan_balance)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-gray-700 whitespace-nowrap">
                                {fmt(r.week_payment)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-green-600 whitespace-nowrap">
                                {fmt(r.today_payment)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold text-amber-600 bg-amber-50 whitespace-nowrap">
                                {fmt(r.total_arrears)}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-gray-500 whitespace-nowrap">
                                {r.loan_code}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    r.ex_follow_up
                                      ? "bg-green-100 text-green-700 border-0 text-xs"
                                      : "bg-gray-100 text-gray-500 border-0 text-xs"
                                  }
                                >
                                  {r.ex_follow_up ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    r.mg_follow_up
                                      ? "bg-green-100 text-green-700 border-0 text-xs"
                                      : "bg-gray-100 text-gray-500 border-0 text-xs"
                                  }
                                >
                                  {r.mg_follow_up ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    r.reminder_letter_1
                                      ? "bg-blue-100 text-blue-700 border-0 text-xs"
                                      : "bg-gray-100 text-gray-500 border-0 text-xs"
                                  }
                                >
                                  {r.reminder_letter_1 ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    r.reminder_letter_2
                                      ? "bg-blue-100 text-blue-700 border-0 text-xs"
                                      : "bg-gray-100 text-gray-500 border-0 text-xs"
                                  }
                                >
                                  {r.reminder_letter_2 ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Totals row */}
                          <TableRow className="bg-amber-50 font-bold border-t-2 border-amber-200">
                            <TableCell
                              colSpan={9}
                              className="text-xs font-bold text-gray-700"
                            >
                              TOTALS ({records.length} customers)
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-gray-800 whitespace-nowrap">
                              {fmt(totalLoanAmt)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-amber-700 whitespace-nowrap">
                              {fmt(totalBalance)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-gray-800 whitespace-nowrap">
                              {fmt(totalWeekly)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-green-700 whitespace-nowrap">
                              {fmt(totalTodayPayment)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-amber-700 bg-amber-100 whitespace-nowrap">
                              {fmt(totalArrears)}
                            </TableCell>
                            <TableCell /> {/* loan code col */}
                            <TableCell /> {/* ex follow up */}
                            <TableCell /> {/* mg follow up */}
                            <TableCell /> {/* reminder 1 */}
                            <TableCell /> {/* reminder 2 */}
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Initial state */}
        {!loading && !hasSearched && (
          <Card className="border-0 shadow-lg mx-auto">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Select filters and generate
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Choose a date, branch and executive to view customers with
                  arrears.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ArrearsReport;
