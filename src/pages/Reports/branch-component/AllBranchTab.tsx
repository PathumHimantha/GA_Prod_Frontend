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
  FileText,
  Calendar,
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { API } from "@/apiConfig";

interface AllBranchExecutiveRow {
  userid: number;
  bname: string;
  name: string;
  center_count: number;
  active_count: number;
  case_1: number;
  float_amount: number;
  access_payment: number;
  consumer_new_count: number;
  consumer_new_amount: number;
  consumer_renew_count: number;
  consumer_renew_amount: number;
  business_new_count: number;
  business_new_amount: number;
  business_renew_count: number;
  business_renew_amount: number;
  daily_new_count: number;
  daily_new_amount: number;
  daily_renew_count: number;
  daily_renew_amount: number;
  total_loan_count: number;
  total_loan_amount: number;
  submitted_collection: number;
  cash_collection: number;
  deposit_collection: number;
  death_settlement: number;
  expenses: number;
  submitted_balance: number;
  submitted_cash_balance: number;
  cash_in_hand: number;
  status: "Submitted" | "Not Submitted";
  submit_time: string | null;
}

interface AllBranchResponse {
  rows: AllBranchExecutiveRow[];
  totals: {
    center_count: number;
    active_count: number;
    float_amount: number;
    access_payment: number;
    consumer_new_count: number;
    consumer_new_amount: number;
    consumer_renew_count: number;
    consumer_renew_amount: number;
    business_new_count: number;
    business_new_amount: number;
    business_renew_count: number;
    business_renew_amount: number;
    daily_new_count: number;
    daily_new_amount: number;
    daily_renew_count: number;
    daily_renew_amount: number;
    total_loan_count: number;
    total_loan_amount: number;
    submitted_collection: number;
    cash_collection: number;
    deposit_collection: number;
    death_settlement: number;
    expenses: number;
    submitted_balance: number;
    submitted_cash_balance: number;
    cash_in_hand: number;
  };
  selected_date: string;
}

const fmt = (n: number) => Number(n).toLocaleString("en-LK");

const AllBranchTab = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isBranchManager = user?.status === "branch_manager";
  const FEATURES = {
    DAILY_LOAN_ENABLED: true, // Set to true when ready to release
  };

  // Filter state
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    row: AllBranchExecutiveRow;
  } | null>(null);
  // Data state
  const [rows, setRows] = useState<AllBranchExecutiveRow[]>([]);
  const [totals, setTotals] = useState<any>(null);

  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 5000);
    }
  };

  // Load report on initial mount
  useEffect(() => {
    if (!isBranchManager) {
      loadReport();
    }
    setInitialLoad(false);
  }, []);

  // Load report when date changes
  useEffect(() => {
    if (!initialLoad && !isBranchManager) {
      loadReport();
    }
  }, [selectedDate]);

  // Load report
  const loadReport = useCallback(async () => {
    if (!selectedDate || isBranchManager) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        user_branch: user?.bname || "",
      });

      const res = await fetch(
        `${API.report.getAllBranchExecutiveReport}?${params}`,
      );
      const data: AllBranchResponse = await res.json();

      //   if (!res.ok) throw new Error(data.error);

      // Sort by branch name then executive name (like PHP usort)
      const sortedRows = (data.rows || []).sort((a, b) => {
        const branchCompare = a.bname.localeCompare(b.bname);
        return branchCompare !== 0
          ? branchCompare
          : a.name.localeCompare(b.name);
      });

      setRows(sortedRows);
      setTotals(data.totals || null);
    } catch (err: any) {
      flash("error", err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user, isBranchManager]);
  const Tooltip = () => {
    if (!tooltip) return null;
    const r = tooltip.row;
    const isSubmitted = r.status === "Submitted";
    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
      >
        <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 min-w-[200px] text-xs border border-gray-700">
          <div className="font-semibold text-gray-300 mb-2 text-[10px] uppercase tracking-wide">
            {r.name}
          </div>
          <div className="space-y-1.5">
            {[
              ["Total Loan Amt", fmt(r.total_loan_amount)],
              ["Cash Collected", fmt(r.cash_collection)],
              ["Online / CDK", fmt(r.deposit_collection)],
              ["Submit Balance", fmt(r.submitted_balance)],
              [
                "Cash Balance",
                fmt((r.submitted_balance || 0) - (r.deposit_collection || 0)),
              ],
              ["Cash In Hand", fmt(r.cash_in_hand)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-gray-400">{label}</span>
                <span className="font-semibold text-white">{value}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 pt-1.5 mt-1 border-t border-gray-700">
              <span className="text-gray-400">Submitted</span>
              <span
                className={`font-bold ${isSubmitted ? "text-green-400" : "text-red-400"}`}
              >
                {isSubmitted ? "✓ Yes" : "✗ No"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If branch manager, show access denied
  if (isBranchManager) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-16">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
          <Building2 className="w-7 h-7 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-gray-600">Access Restricted</p>
        <p className="text-xs text-gray-400">
          Branch managers cannot view all branches report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {successMsg && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Filter Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            View All Branches by Date
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            {/* Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Select Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 h-11 bg-white border-gray-200"
                />
              </div>
            </div>

            {/* Button - Optional refresh button */}
            <Button
              onClick={loadReport}
              className="h-11 gap-2 bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Refresh
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

      {/* Report Table */}
      {!loading && rows.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                All Records for {selectedDate}
              </CardTitle>
              {/* Submission summary */}
              {rows.length > 0 &&
                (() => {
                  const submitted = rows.filter(
                    (r) => r.status === "Submitted",
                  ).length;
                  const total = rows.length;
                  return (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                        <span className="text-sm font-bold text-gray-800">
                          {submitted}
                        </span>
                        <span className="text-xs text-gray-400">submitted</span>
                      </div>
                      <span className="text-gray-300">/</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-800">
                          {total}
                        </span>
                        <span className="text-xs text-gray-400">
                          total users
                        </span>
                      </div>
                      <div className="ml-2 h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${(submitted / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-green-600">
                        {Math.round((submitted / total) * 100)}%
                      </span>
                    </div>
                  );
                })()}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[2200px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center w-8"
                      >
                        #
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Branch
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Executive
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Centers Today
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Active Customers
                      </TableHead>
                      {/* <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Case 1
                      </TableHead> */}
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Float Amount
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-green-100"
                      >
                        Excess Payment
                      </TableHead>
                      <TableHead
                        colSpan={4}
                        className="border border-gray-200 text-center bg-orange-100"
                      >
                        Consumer Loans
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-red-100"
                      >
                        Business Loans
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <TableHead
                          colSpan={2}
                          className="border border-gray-200 text-center bg-purple-100"
                        >
                          Daily Loan
                        </TableHead>
                      )}
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-green-100"
                      >
                        Total Loan
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-blue-100"
                      >
                        Submitted Collection
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-purple-100"
                      >
                        Submitted Total Collection
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-gray-200"
                      >
                        Death Settlement
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-blue-200"
                      >
                        Expenses
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-teal-100"
                      >
                        Submitted Balance
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-teal-100"
                      >
                        Submitted Cash Balance
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-cyan-100"
                      >
                        Cash In Hand
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Submit
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center"
                      >
                        Submit Time
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-orange-200"
                      >
                        New
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-orange-200"
                      >
                        Renew
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-red-200"
                      >
                        New+Renew
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <TableHead
                          colSpan={2}
                          className="border border-gray-200 text-center bg-purple-200"
                        >
                          New+Renew
                        </TableHead>
                      )}
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-green-200"
                      >
                        Count
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-green-200"
                      >
                        Amount
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-blue-200"
                      >
                        Cash
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-blue-200"
                      >
                        CDK/Online
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableHead className="border border-gray-200 text-center bg-orange-300">
                        Count
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-orange-300">
                        Amount
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-orange-300">
                        Count
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-orange-300">
                        Amount
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-red-300">
                        Count
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-red-300">
                        Amount
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <>
                          <TableHead className="border border-gray-200 text-center bg-purple-300">
                            Count
                          </TableHead>
                          <TableHead className="border border-gray-200 text-center bg-purple-300">
                            Amount
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const businessCount =
                        (row.business_new_count || 0) +
                        (row.business_renew_count || 0);
                      const businessAmount =
                        (row.business_new_amount || 0) +
                        (row.business_renew_amount || 0);
                      const dailyCount =
                        (row.daily_new_count || 0) +
                        (row.daily_renew_count || 0);
                      const dailyAmount =
                        (row.daily_new_amount || 0) +
                        (row.daily_renew_amount || 0);
                      const submittedCashBalance =
                        (row.submitted_balance || 0) -
                        (row.deposit_collection || 0);
                      const isSubmitted = row.status === "Submitted";
                      return (
                        <TableRow
                          key={`${row.bname}-${row.name}`}
                          className={`cursor-pointer transition-colors ${
                            isSubmitted
                              ? "bg-green-50 hover:bg-green-100"
                              : idx % 2 === 0
                                ? "bg-red-100 hover:bg-red-50"
                                : "bg-red-100 hover:bg-red-50"
                          }`}
                          onClick={() =>
                            window.open(
                              `/dashboard/day-end-report?bname=${encodeURIComponent(row.bname)}&userid=${encodeURIComponent(row.userid || "")}&name=${encodeURIComponent(row.name)}`,
                              "_blank",
                            )
                          }
                          onMouseMove={(e) =>
                            setTooltip({ x: e.clientX, y: e.clientY, row })
                          }
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <TableCell className="text-center text-xs text-gray-500 font-mono">
                            {idx + 1}
                          </TableCell>

                          <TableCell className="font-bold text-xs">
                            {row.bname}
                          </TableCell>
                          <TableCell className=" text-xs">{row.name}</TableCell>
                          <TableCell className="text-center text-xs">
                            {row.center_count}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.active_count}
                          </TableCell>
                          {/* <TableCell className="text-center text-xs">
                            {row.case_1}
                          </TableCell> */}
                          <TableCell className="text-right text-xs">
                            {fmt(row.float_amount)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.access_payment)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.consumer_new_count}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.consumer_new_amount)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.consumer_renew_count}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.consumer_renew_amount)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {businessCount}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(businessAmount)}
                          </TableCell>
                          {FEATURES.DAILY_LOAN_ENABLED && (
                            <>
                              <TableCell className="text-center text-xs">
                                {dailyCount}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {fmt(dailyAmount)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-center font-semibold text-xs">
                            {row.total_loan_count}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {fmt(row.total_loan_amount)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.cash_collection)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.deposit_collection)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {fmt(row.submitted_collection)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.death_settlement)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.expenses)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {fmt(row.submitted_balance)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {fmt(submittedCashBalance)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {fmt(row.cash_in_hand)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.status === "Submitted" ? (
                              <Badge className="bg-green-100 text-green-700 border-gray-400">
                                Yes
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-gray-400">
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.submit_time
                              ? new Date(row.submit_time).toLocaleString()
                              : ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Totals row */}
                    {totals && (
                      <TableRow className="bg-amber-50 font-bold border-t-2 border-amber-300">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.center_count}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.active_count}
                        </TableCell>
                        {/* <TableCell className="text-center text-xs">
                          {totals.case_1}
                        </TableCell> */}
                        <TableCell className="text-right text-xs">
                          {fmt(totals.float_amount)}
                        </TableCell>
                        <TableCell className="text-right bg-green-50 text-xs">
                          {fmt(totals.access_payment)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.consumer_new_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.consumer_new_amount)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.consumer_renew_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.consumer_renew_amount)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {(totals.business_new_count || 0) +
                            (totals.business_renew_count || 0)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(
                            (totals.business_new_amount || 0) +
                              (totals.business_renew_amount || 0),
                          )}
                        </TableCell>
                        {FEATURES.DAILY_LOAN_ENABLED && (
                          <>
                            <TableCell className="text-center text-xs">
                              {(totals.daily_new_count || 0) +
                                (totals.daily_renew_count || 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {fmt(
                                (totals.daily_new_amount || 0) +
                                  (totals.daily_renew_amount || 0),
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-center text-xs">
                          {totals.total_loan_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.total_loan_amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.cash_collection)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.deposit_collection)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.submitted_collection)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.death_settlement)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.expenses)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.submitted_balance)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(
                            (totals.submitted_balance || 0) -
                              (totals.deposit_collection || 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.cash_in_hand)}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Tooltip />
      {/* Empty state */}
      {!loading && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">No records found</p>
          <p className="text-xs text-gray-400">
            No records found for {selectedDate}.
          </p>
        </div>
      )}
    </div>
  );
};

export default AllBranchTab;
