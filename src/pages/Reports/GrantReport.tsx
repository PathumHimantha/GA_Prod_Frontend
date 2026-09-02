import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Search,
  Filter,
  Calendar,
  Building2,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { API } from "@/apiConfig";
import SearchableSelect from "@/components/SearchableSelect";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import * as XLSX from "xlsx";
import { sub } from "date-fns";

interface Customer {
  id: number;
  bname: string;
  bcode: string;
  center: string;
  ccode: string;
  group: string;
  executive_name: string;
  branch_day: string;
  cname: string;
  nic: string;
  loan_amount: number;
  type: string;
  period: number;
  interest: number;
  customer_code: string;
  loan_date: string;
  loan_code: string;
  loan_category: string;
  due_date: string;
  payment: number;
  payment_date: string | null;
  loan_balance: number;
  full_loan: number;
  week_payment: number;
  document_fee: number;
  insurance_fee: number;
  interest_amount: number;
  to_pay: number;
}

const GrantReport = () => {
  const { user } = useAuth();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [dateFrom, setDateFrom] = useState(
    thirtyDaysAgo.toISOString().split("T")[0],
  );
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchOptions, setBranchOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [totalSummary, setTotalSummary] = useState({
    totalLoans: 0,
    totalAmount: 0,
    totalBalance: 0,
    totalPaid: 0,
  });
  const [grantStats, setGrantStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchGrantStats = async (
    dateFrom: string,
    dateTo: string,
    branch: string,
  ) => {
    setStatsLoading(true);
    try {
      const res = await fetch(API.report.grantStats, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_from: dateFrom,
          date_to: dateTo,
          branch: branch === "all" ? "" : branch,
          user_role: user?.role || user?.status,
          user_branch: user?.bname,
          user_id: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success) setGrantStats(data.stats);
    } catch (err) {
      console.error("grant_stats error:", err);
    } finally {
      setStatsLoading(false);
    }
  };
  // Fetch branches based on user role - using branchHelpers
  useEffect(() => {
    if (!user) return;

    fetchBranches({
      role: user.role || user.status,
      userId: user.id?.toString(),
      bname: user.bname,
    }).then((branches: Branch[]) => {
      // Create unique options with unique values
      const uniqueBranches = branches.reduce(
        (acc: Branch[], current: Branch) => {
          const exists = acc.find((b) => b.bname === current.bname);
          if (!exists) {
            acc.push(current);
          }
          return acc;
        },
        [],
      );

      setBranchOptions([
        { label: "-- All Branches --", value: "all" },
        ...uniqueBranches.map((b) => ({
          label: b.bname,
          value: b.bname,
          sub: b.bcode, // Add this line to show branch code
          key: `${b.bname}-${b.bcode || Math.random()}`,
        })),
      ]);
    });
  }, [user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    fetchGrantStats(dateFrom, dateTo, selectedBranch);

    try {
      const response = await fetch(API.report.getGrantReport, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_from: dateFrom,
          date_to: dateTo,
          branch: selectedBranch === "all" ? "" : selectedBranch,
          user_role: user?.role || user?.status,
          user_branch: user?.bname,
          user_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Ensure data.data is always an array
        const resultsData = Array.isArray(data.data)
          ? data.data
          : data.data
            ? [data.data]
            : [];

        setResults(resultsData);
        setSuccess(true);

        // Calculate totals (works with array)
        const summary = resultsData.reduce(
          (acc: any, curr: Customer) => ({
            totalLoans: acc.totalLoans + 1,
            totalAmount:
              acc.totalAmount + (parseFloat(curr.loan_amount as any) || 0),
            totalBalance:
              acc.totalBalance + (parseFloat(curr.loan_balance as any) || 0),
            totalPaid:
              acc.totalPaid +
              (parseFloat(curr.full_loan as any) -
                parseFloat(curr.loan_balance as any) || 0),
          }),
          { totalLoans: 0, totalAmount: 0, totalBalance: 0, totalPaid: 0 },
        );

        setTotalSummary(summary);
      } else {
        setError(data.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (results.length === 0) return;
    setExporting(true);

    try {
      const exportData = results.map((row) => ({
        ID: row.id,
        Branch: row.bname,
        "Branch Code": row.bcode,
        Center: row.center,
        "Center Code": row.ccode,
        Group: row.group,
        Executive: row.executive_name || "—",
        Day: row.branch_day || "—",
        "Customer Name": row.cname,
        NIC: row.nic,
        "Customer Code": row.customer_code,
        "Loan Code": row.loan_code,
        Category: row.loan_category,
        "Loan Date": row.loan_date,
        "Due Date": row.due_date || "—",
        "Loan Amount": parseFloat(row.loan_amount as any) || 0,
        "Full Loan": parseFloat(row.full_loan as any) || 0,
        Balance: parseFloat(row.loan_balance as any) || 0,
        "Week Payment": parseFloat(row.week_payment as any) || 0,
        "Document Fee": parseFloat(row.document_fee as any) || 0,
        "Insurance Fee": parseFloat(row.insurance_fee as any) || 0,
        "Interest Amount": parseFloat(row.interest_amount as any) || 0,
        "Amount To Pay": parseFloat(row.to_pay as any) || 0,
        Payment: parseFloat(row.payment as any) || 0,
        "Payment Date": row.payment_date || "—",
        Type: row.type,
        Period: Number(row.period) || 0,
        "Interest Rate": parseFloat(row.interest as any) || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      // ── Set column widths ──────────────────────────────────────
      ws["!cols"] = [
        { wch: 6 }, // ID
        { wch: 14 }, // Branch
        { wch: 10 }, // Branch Code
        { wch: 18 }, // Center
        { wch: 8 }, // Center Code
        { wch: 7 }, // Group
        { wch: 22 }, // Executive
        { wch: 10 }, // Day
        { wch: 28 }, // Customer Name
        { wch: 14 }, // NIC
        { wch: 14 }, // Customer Code
        { wch: 28 }, // Loan Code
        { wch: 16 }, // Category
        { wch: 12 }, // Loan Date
        { wch: 12 }, // Due Date
        { wch: 14 }, // Loan Amount
        { wch: 14 }, // Full Loan
        { wch: 14 }, // Balance
        { wch: 14 }, // Week Payment
        { wch: 12 }, // Document Fee
        { wch: 12 }, // Insurance Fee
        { wch: 14 }, // Interest Amount
        { wch: 14 }, // Amount To Pay
        { wch: 12 }, // Payment
        { wch: 12 }, // Payment Date
        { wch: 10 }, // Type
        { wch: 8 }, // Period
        { wch: 12 }, // Interest Rate
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grant Report");

      XLSX.writeFile(wb, `grant_report_${dateFrom}_to_${dateTo}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      setError("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const num = parseFloat(amount as any) || 0;
    return `Rs. ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Grant Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View customer loan details by date range
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">
              {today.toLocaleDateString()}
            </span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {today.toLocaleDateString("en-US", { weekday: "long" })}
            </span>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="mb-6 border-0 shadow-lg mx-auto">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-800">
                  Filter Report
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select date range and branch
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="pl-9 h-12 bg-white border-gray-200"
                      required
                    />
                  </div>
                </div>
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
                      className="pl-9 h-12 bg-white border-gray-200"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Branch Selection - using the same pattern as FloatForm */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Branch
                </Label>
                <SearchableSelect
                  options={branchOptions}
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  placeholder="-- Select Branch --"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                  disabled={loading}
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
                {results.length > 0 && (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleExportToExcel}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Export as Excel
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>

            {/* Messages */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && results.length === 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-600">
                  No results found for the selected criteria
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
        {results.length > 0 && (
          <Card className="border-0 shadow-lg  mx-auto">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg font-bold text-gray-800">
                    Filtered Results ({results.length} records)
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Grant Stats */}
              {grantStats && (
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-gray-700">
                      Grant Summary
                      {statsLoading && (
                        <Loader2 className="w-3 h-3 animate-spin inline ml-2 text-gray-400" />
                      )}
                    </p>
                  </div>

                  {/* Column headers */}
                  <div className="hidden sm:grid sm:grid-cols-3 gap-3 mb-2 px-3">
                    {["", "Total Loans", "Total Amount", ""].map((h, i) => (
                      <p
                        key={i}
                        className="text-xs font-semibold text-gray-400 text-right first:text-right"
                      >
                        {h}
                      </p>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        label: "Consumer Loan",
                        key: "consumer",
                        accent: "border-teal-400",
                        labelColor: "text-teal-700",
                        bg: "bg-teal-50/60",
                      },
                      {
                        label: "Business Loan",
                        key: "business",
                        accent: "border-blue-400",
                        labelColor: "text-blue-700",
                        bg: "bg-blue-50/60",
                      },
                      {
                        label: "Daily Loan",
                        key: "daily",
                        accent: "border-purple-400",
                        labelColor: "text-purple-700",
                        bg: "bg-purple-50/60",
                      },
                    ].map(({ label, key, accent, labelColor, bg }) => {
                      const row = grantStats?.[key];
                      if (!row || row.total_loans === 0) return null;
                      return (
                        <div
                          key={key}
                          className={`${bg} rounded-xl px-4 py-3 border-l-4 ${accent}`}
                        >
                          <div className="sm:hidden">
                            <p
                              className={`text-xs font-bold ${labelColor} mb-2`}
                            >
                              {label}
                            </p>
                            <div className="grid grid-cols-2 gap-x-4">
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Total Loans
                                </p>
                                <p className="text-xs font-semibold text-gray-700">
                                  {row.total_loans}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Total Amount
                                </p>
                                <p className="text-xs font-semibold text-amber-700">
                                  {formatCurrency(row.total_amount)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="hidden sm:grid sm:grid-cols-3 gap-3 items-center">
                            <p className={`text-xs font-bold ${labelColor}`}>
                              {label}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 text-right">
                              {row.total_loans}
                            </p>
                            <p className="text-xs font-semibold text-amber-700 text-right">
                              {formatCurrency(row.total_amount)}
                            </p>
                            <div />
                          </div>
                        </div>
                      );
                    })}

                    {/* Totals row */}
                    {grantStats?.totals && (
                      <div className="bg-yellow-500 rounded-xl px-4 py-3 mt-1">
                        <div className="sm:hidden">
                          <p className="text-xs font-bold text-black mb-2">
                            Totals
                          </p>
                          <div className="grid grid-cols-2 gap-x-4">
                            <div>
                              <p className="text-[10px] text-black/60">
                                Total Loans
                              </p>
                              <p className="text-sm font-bold text-black">
                                {grantStats.totals.total_loans}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-black/60">
                                Total Amount
                              </p>
                              <p className="text-sm font-bold text-black">
                                {formatCurrency(grantStats.totals.total_amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:grid sm:grid-cols-3 gap-3 items-center">
                          <p className="text-sm font-bold text-black">Totals</p>
                          <p className="text-sm font-bold text-black text-right">
                            {grantStats.totals.total_loans}
                          </p>
                          <p className="text-sm font-bold text-black text-right">
                            {formatCurrency(grantStats.totals.total_amount)}
                          </p>
                          <div />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Table */}
              <ScrollArea className="w-full">
                <div className="min-w-[2400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Branch</TableHead>
                        <TableHead className="font-semibold">
                          Branch Code
                        </TableHead>
                        <TableHead className="font-semibold">Center</TableHead>
                        <TableHead className="font-semibold">CCode</TableHead>
                        <TableHead className="font-semibold">Group</TableHead>
                        <TableHead className="font-semibold">
                          Executive
                        </TableHead>
                        <TableHead className="font-semibold">Day</TableHead>
                        <TableHead className="font-semibold">
                          Customer Name
                        </TableHead>
                        <TableHead className="font-semibold">NIC</TableHead>
                        <TableHead className="font-semibold text-right">
                          Loan Amount
                        </TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Period</TableHead>
                        <TableHead className="font-semibold">
                          Interest %
                        </TableHead>
                        <TableHead className="font-semibold">
                          Customer Code
                        </TableHead>
                        <TableHead className="font-semibold">
                          Loan Date
                        </TableHead>
                        <TableHead className="font-semibold">
                          Loan Code
                        </TableHead>
                        <TableHead className="font-semibold">
                          Loan Category
                        </TableHead>
                        <TableHead className="font-semibold">
                          Due Date
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Payment
                        </TableHead>
                        <TableHead className="font-semibold">
                          Payment Date
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Balance
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Full Loan
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Week Payment
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Doc Fee
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Ins Fee
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Interest Amount
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Amount To Pay
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row) => (
                        <TableRow
                          key={`${row.id}-${row.loan_code}`}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="text-xs font-mono">
                            {row.id}
                          </TableCell>
                          <TableCell className="text-sm">{row.bname}</TableCell>
                          <TableCell className="text-sm">{row.bcode}</TableCell>
                          <TableCell className="text-sm">
                            {row.center}
                          </TableCell>
                          <TableCell className="text-sm">{row.ccode}</TableCell>
                          <TableCell className="text-sm">{row.group}</TableCell>
                          <TableCell className="text-sm">
                            {row.executive_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/5">
                              {row.branch_day || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-gray-900">
                              {row.cname}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {row.nic}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(row.loan_amount)}
                          </TableCell>
                          <TableCell className="text-sm">{row.type}</TableCell>
                          <TableCell className="text-sm">
                            {row.period}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.interest}%
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {row.customer_code}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.loan_date}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {row.loan_code}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                Number(row.ccode) >= 300
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }
                            >
                              {row.loan_category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.due_date || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {row.payment ? formatCurrency(row.payment) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.payment_date || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600">
                            {formatCurrency(row.loan_balance)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(row.full_loan)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-primary">
                            {formatCurrency(row.week_payment)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(row.document_fee)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(row.insurance_fee)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(row.interest_amount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(row.to_pay)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GrantReport;
