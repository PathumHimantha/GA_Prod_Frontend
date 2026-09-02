import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  Building2,
  Search,
  Download,
  CheckCircle2,
  TrendingUp,
  Banknote,
  FileSpreadsheet,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import SearchableSelect from "@/components/SearchableSelect";
import * as XLSX from "xlsx";

const ALL = "__all__";

interface SelectOption {
  label: string;
  value: string;
  sub?: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SettledRecord {
  id: number;
  bname: string;
  bcode: string;
  center: string;
  ccode: string;
  group: string;
  cname: string;
  executive_name: string;
  nic: string;
  loan_amount: number;
  type: string;
  period: number;
  interest: number;
  customer_code: string;
  loan_date: string;
  loan_code: string;
  due_date: string;
  payment: number;
  loan_balance: number;
  full_loan: number;
  week_payment: number;
  payment_date: string;
  interest_amount: number;
  total_paid: number;
  last_payment: number;
  last_payment_date: string;
}

interface Summary {
  total: number;
  totalLoanAmount: number;
  totalFullLoan: number;
  totalInterest: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `Rs. ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
};

const todayISO = () => new Date().toISOString().split("T")[0];
const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
};

// ── Component ─────────────────────────────────────────────────────────────────
const SettledCustomers = () => {
  const { user } = useAuth();

  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isBranchManager = user?.status === "branch_manager";
  const isManager = user?.status === "manager";
  const isExecutive = user?.status === "executive";
  const isKegalleUser = user?.bname?.toUpperCase() === "KEGALLE";
  const showBranchFilter =
    isAdmin || isRegional || isBranchManager || isManager;

  // ── Filters ───────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo());
  const [dateTo, setDateTo] = useState(todayISO());
  const [branch, setBranch] = useState(isExecutive ? user?.bname || ALL : ALL);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [records, setRecords] = useState<SettledRecord[]>([]);
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // ── Load branch options using fetchBranches helper ────────────────────────
  useEffect(() => {
    const loadBranches = async () => {
      if (!user) return;
      setLoadingBranches(true);
      try {
        const branchesData = await fetchBranches({
          role: user.status,
          userId: user.id.toString(),
          bname: user.bname,
        });

        let options: SelectOption[] = [];

        if (isAdmin) {
          options = [
            { label: "All Branches", value: ALL },
            ...branchesData.map((b: Branch) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ];
        } else if (isRegional) {
          options = [
            { label: "All Branches", value: ALL },
            ...branchesData.map((b: Branch) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ];
        } else if (isKegalleUser && (isBranchManager || isManager)) {
          options = [
            { label: "KEGALLE", value: "KEGALLE", sub: "G01" },
            { label: "NARAMMALA", value: "NARAMMALA", sub: "G04" },
            { label: "KEGALLE + NARAMMALA", value: "KEGALLE+NARAMMALA" },
          ];
        } else if (isBranchManager || isManager) {
          options = [
            {
              label: user.bname || "",
              value: user.bname || "",
              sub: branchesData.find((b: Branch) => b.bname === user.bname)
                ?.bcode,
            },
          ];
        } else if (isExecutive) {
          // Executive: branch is fixed, no dropdown needed
          options = [
            {
              label: user.bname || "",
              value: user.bname || "",
            },
          ];
        }

        setBranchOptions(options);

        // Set default branch for non-admin/non-regional if not already set
        if (!isAdmin && !isRegional && options.length > 0 && branch === ALL) {
          setBranch(options[0].value);
        }
      } catch (err) {
        console.error("Error loading branches:", err);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [
    user,
    isAdmin,
    isRegional,
    isBranchManager,
    isManager,
    isKegalleUser,
    isExecutive,
  ]); // eslint-disable-line

  // ── Fetch records ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        bname: user?.bname || "",
      });
      // Send branch filter — handle KEGALLE+NARAMMALA combined option
      if (branch && branch !== ALL) {
        if (branch === "KEGALLE+NARAMMALA") {
          p.set("branch", "KEGALLE");
          p.set("branch2", "NARAMMALA");
        } else {
          p.set("branch", branch);
        }
      }

      const res = await fetch(
        `${API_BASE_URL}/api/report/settled-customers?${p}`,
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
  }, [dateFrom, dateTo, branch, user]);

  // ── XLSX Download ─────────────────────────────────────────────────────────
  const downloadXLSX = () => {
    if (!records.length) return;

    const sheetData = records.map((r, i) => ({
      "#": i + 1,
      Branch: r.bname,
      "Branch Code": r.bcode,
      Center: r.center,
      "Center Code": r.ccode,
      Group: r.group,
      "Executive Name": r.executive_name,
      "Customer Name": r.cname,
      NIC: r.nic,
      "Customer Code": r.customer_code,
      "Loan Code": r.loan_code,
      Type: r.type,
      "Loan Amount (Rs.)": Number(r.loan_amount),
      "Full Loan (Rs.)": Number(r.full_loan),
      "Interest Amount (Rs.)": Number(r.interest_amount),
      "Weekly Payment (Rs.)": Number(r.week_payment),
      "Period (Weeks)": r.period,
      "Interest Rate": `${(Number(r.interest) * 100).toFixed(0)}%`,
      "Loan Date": fmtDate(r.loan_date),
      "Due Date": fmtDate(r.due_date),
      "Settlement Date": fmtDate(r.payment_date),
      "Total Paid (Rs.)": Number(r.total_paid),
      "Loan Balance": Number(r.loan_balance),
      "Last Payment (Rs.)": Number(r.last_payment),
      "Last Payment Date": fmtDate(r.last_payment_date),
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Column widths
    ws["!cols"] = [
      { wch: 4 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 10 },
      { wch: 7 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 13 },
      { wch: 13 },
      { wch: 16 },
      { wch: 16 },
      { wch: 13 },
      { wch: 18 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Settled Customers");

    const filename = `Settled_Customers_${dateFrom}_to_${dateTo}${branch ? `_${branch}` : ""}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Settled Customer Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Customers whose loans are fully repaid (balance = 0)
            </p>
          </div>
          {hasSearched && records.length > 0 && (
            <Button
              onClick={downloadXLSX}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white h-10"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download XLSX
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search size={18} className="text-primary" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Date From
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-9 h-11 bg-white border-gray-200"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Date To
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-9 h-11 bg-white border-gray-200"
                  />
                </div>
              </div>

              {/* Branch */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Branch
                </Label>
                {isExecutive ? (
                  // Executive: branch locked, show as read-only
                  <div className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {user?.bname}
                    </span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    placeholder={
                      loadingBranches
                        ? "Loading branches..."
                        : "Select branch..."
                    }
                    disabled={loadingBranches}
                  />
                )}
              </div>

              {/* Search Button */}
              <Button
                onClick={fetchData}
                disabled={loading || !dateFrom || !dateTo}
                className="h-11 gap-2 bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Summary Cards */}
        {!loading && summary && hasSearched && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Settled",
                value: summary.total.toLocaleString(),
                icon: Users,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "Total Loan Amount",
                value: fmt(summary.totalLoanAmount),
                icon: Banknote,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Total Full Loan",
                value: fmt(summary.totalFullLoan),
                icon: TrendingUp,
                color: "text-primary",
                bg: "bg-primary/5",
              },
              {
                label: "Total Interest",
                value: fmt(summary.totalInterest),
                icon: CheckCircle2,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div
                    className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <p className={`text-base font-bold ${color} leading-tight`}>
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && hasSearched && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  Settled Customers
                  {summary && (
                    <Badge className="bg-green-100 text-green-700 border-0 ml-2">
                      {summary.total} records
                    </Badge>
                  )}
                </CardTitle>
                {records.length > 0 && (
                  <Button
                    onClick={downloadXLSX}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <Download className="w-4 h-4" />
                    Export XLSX
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-center py-16">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    No settled customers found
                  </p>
                  <p className="text-xs text-gray-400">
                    No records match the selected date range and branch.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[2000px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-700 hover:bg-gray-700">
                          {[
                            "#",
                            "Branch",
                            "Br. Code",
                            "Center",
                            "Ctr. Code",
                            "Group",
                            "Executive",
                            "Customer Name",
                            "NIC",
                            "Customer Code",
                            "Loan Code",
                            "Type",
                            "Loan Amt.",
                            "Full Loan",
                            "Interest Amt.",
                            "Weekly Pay.",
                            "Period",
                            "Int. Rate",
                            "Loan Date",
                            "Due Date",
                            "Settlement Date",
                            "Total Paid",
                            "Balance",
                            "Last Payment",
                            "Last Pay. Date",
                          ].map((h) => (
                            <TableHead
                              key={h}
                              className="text-xs font-semibold text-white whitespace-nowrap border border-gray-600 text-center py-2"
                            >
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((r, i) => (
                          <TableRow
                            key={`${r.loan_code}-${i}`}
                            className={
                              i % 2 === 0
                                ? "bg-white hover:bg-green-50/30"
                                : "bg-gray-50 hover:bg-green-50/30"
                            }
                          >
                            <TableCell className="text-xs text-gray-400 text-center border border-gray-100 py-2">
                              {i + 1}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-gray-800 border border-gray-100 py-2 whitespace-nowrap">
                              {r.bname}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 border border-gray-100 py-2">
                              {r.bcode}
                            </TableCell>
                            <TableCell className="text-xs text-gray-700 border border-gray-100 py-2 whitespace-nowrap">
                              {r.center}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 border border-gray-100 py-2 text-center">
                              {r.ccode}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 border border-gray-100 py-2 text-center">
                              {r.group}
                            </TableCell>
                            <TableCell className="text-xs text-gray-700 border border-gray-100 py-2 whitespace-nowrap">
                              {r.executive_name || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-gray-800 border border-gray-100 py-2 whitespace-nowrap">
                              {r.cname}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-gray-600 border border-gray-100 py-2">
                              {r.nic}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-gray-600 border border-gray-100 py-2">
                              {r.customer_code}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-gray-600 border border-gray-100 py-2 whitespace-nowrap">
                              {r.loan_code}
                            </TableCell>
                            <TableCell className="text-xs text-center border border-gray-100 py-2">
                              {r.type === "newloan" ? (
                                <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0 border-0">
                                  New
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0 border-0">
                                  Renew
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-gray-800 border border-gray-100 py-2">
                              {fmt(r.loan_amount)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-gray-800 border border-gray-100 py-2">
                              {fmt(r.full_loan)}
                            </TableCell>
                            <TableCell className="text-xs text-right text-amber-700 border border-gray-100 py-2">
                              {fmt(r.interest_amount)}
                            </TableCell>
                            <TableCell className="text-xs text-right text-gray-600 border border-gray-100 py-2">
                              {fmt(r.week_payment)}
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-600 border border-gray-100 py-2">
                              {r.period}w
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-600 border border-gray-100 py-2">
                              {(Number(r.interest) * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-600 border border-gray-100 py-2 whitespace-nowrap">
                              {fmtDate(r.loan_date)}
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-600 border border-gray-100 py-2 whitespace-nowrap">
                              {fmtDate(r.due_date)}
                            </TableCell>
                            <TableCell className="text-xs text-center font-semibold text-green-700 border border-gray-100 py-2 whitespace-nowrap">
                              {fmtDate(r.payment_date)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-semibold text-green-700 border border-gray-100 py-2">
                              {fmt(r.total_paid)}
                            </TableCell>
                            <TableCell className="text-xs text-center border border-gray-100 py-2">
                              <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                {fmt(r.loan_balance)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right text-gray-700 border border-gray-100 py-2">
                              {r.last_payment ? fmt(r.last_payment) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-600 border border-gray-100 py-2 whitespace-nowrap">
                              {fmtDate(r.last_payment_date)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state — before first search */}
        {!loading && !hasSearched && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Select a date range and generate
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Choose the settlement date range and optionally filter by
                  branch, then click Generate Report.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SettledCustomers;
