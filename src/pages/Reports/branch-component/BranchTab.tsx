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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  Eye,
} from "lucide-react";
import { API } from "@/apiConfig";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import SearchableSelect from "@/components/SearchableSelect";

const ALL_BRANCHES = "__all__";

interface SelectOption {
  label: string;
  value: string;
  sub?: string;
}

interface BranchReportRow {
  executive: string;
  plot: number;
  access_payment: number;
  centers_today: number;
  active_customers: number;
  case_1: number;
  con_new_count: number;
  con_new_amount: number;
  con_renew_count: number;
  con_renew_amount: number;
  biz_count: number;
  biz_amount: number;
  daily_new_count: number;
  daily_new_amount: number;
  daily_renew_count: number;
  daily_renew_amount: number;
  loan_count: number;
  loan_amount: number;
  cash_collection: number;
  deposit_collection: number;
  submitted_collection: number;
  death_settlement: number;
  expenses: number;
  submitted_balance: number;
  submitted_cash_balance: number;
  cash_in_hand: number;
  status: "Submitted" | "Not Submitted";
  submit_time: string | null;
}

interface BranchReportResponse {
  rows: BranchReportRow[];
  totals: BranchReportRow;
  all_submitted: boolean;
  branch_dayend_exists: boolean;
  submit_time: string | null;
  selected_date: string;
  bname: string;
}

const fmt = (n: number) => Number(n).toLocaleString("en-LK");

const BranchTab = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isBranchManager = user?.status === "branch_manager";
  const isExecutive =
    user?.status === "executive" || user?.status === "manager";
  const isKegalleUser = user?.bname === "KEGALLE";

  // Determine if user should auto-load (branch managers and executives auto-load their branch)
  const shouldAutoLoad = isBranchManager || isExecutive;

  // Filter state
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranch, setSelectedBranch] = useState<string>(
    shouldAutoLoad ? user?.bname || "" : "",
  );

  // Data state
  const [rows, setRows] = useState<BranchReportRow[]>([]);
  const [totals, setTotals] = useState<BranchReportRow | null>(null);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [branchDayEndExists, setBranchDayEndExists] = useState(false);
  const [submitTime, setSubmitTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Branch options
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [dropLoading, setDropLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    row: BranchReportRow;
  } | null>(null);
  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 5000);
    }
  };
  const FEATURES = {
    DAILY_LOAN_ENABLED: true, // Set to true when ready to release
  };
  // Load branches based on user role
  useEffect(() => {
    const loadBranches = async () => {
      if (!user) return;
      setDropLoading(true);
      try {
        const branchesData = await fetchBranches({
          role: user.status,
          userId: user.id.toString(),
          bname: user.bname,
        });

        let options: SelectOption[] = [];

        if (isAdmin) {
          // Admin sees all branches with "All Branches" option
          options = [
            { label: "All Branches", value: ALL_BRANCHES },
            ...branchesData.map((b: Branch) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ];
        } else if (isRegional) {
          // Regional managers see assigned branches with "All Branches" option
          // You'll need to implement actual assigned branches logic
          options = [
            { label: "All Branches", value: ALL_BRANCHES },
            ...branchesData.map((b: Branch) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ];
        } else if (isKegalleUser && (isBranchManager || isExecutive)) {
          // KEGALLE branch managers see KEGALLE and NARAMMALA
          options = [
            { label: "KEGALLE", value: "KEGALLE", sub: "G01" },
            { label: "NARAMMALA", value: "NARAMMALA", sub: "G04" },
          ];
          // Auto-select KEGALLE by default
          if (!selectedBranch) {
            setSelectedBranch("KEGALLE");
          }
        } else if (isBranchManager || isExecutive) {
          // Other branch managers see only their branch
          options = [
            {
              label: user.bname || "",
              value: user.bname || "",
              sub: branchesData.find((b: Branch) => b.bname === user.bname)
                ?.bcode,
            },
          ];
          // Auto-select their branch
          setSelectedBranch(user.bname || "");
        }

        setBranchOptions(options);
      } catch (error) {
        console.error("Error loading branches:", error);
      } finally {
        setDropLoading(false);
        setInitialLoad(false);
      }
    };

    loadBranches();
  }, [user, isAdmin, isRegional, isBranchManager, isExecutive, isKegalleUser]);

  // Auto-load for branch managers/executives only
  useEffect(() => {
    if (shouldAutoLoad && !dropLoading && selectedBranch && selectedDate) {
      loadReport();
    }
  }, [selectedBranch, selectedDate, dropLoading, shouldAutoLoad]);

  // Load report
  const loadReport = useCallback(async () => {
    if (!selectedDate || !selectedBranch) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        user_branch: user?.bname || "",
      });

      // Only send branch parameter if not "All Branches"
      if (selectedBranch && selectedBranch !== ALL_BRANCHES) {
        params.set("bname", selectedBranch);
      }

      const res = await fetch(`${API.report.getBranchReport}?${params}`);
      const data: BranchReportResponse = await res.json();

      //   if (!res.ok) throw new Error(data.error);

      setRows(data.rows || []);
      setTotals(data.totals || null);
      setAllSubmitted(data.all_submitted || false);
      setBranchDayEndExists(data.branch_dayend_exists || false);
      setSubmitTime(data.submit_time || null);
    } catch (err: any) {
      flash("error", err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranch, user]);

  // Handle branch day end submission
  const handleSubmitBranchDayEnd = async () => {
    if (!totals) return;
    setSubmitting(true);
    try {
      const res = await fetch(API.report.submitBranchDayEnd, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bname: selectedBranch,
          date: selectedDate,
          executive_name: user?.name,
          total_plot: totals.plot,
          access_payment: totals.access_payment,
          total_centers: totals.centers_today,
          total_active: totals.active_customers,
          con_new_count: totals.con_new_count,
          con_new_amt: totals.con_new_amount,
          con_ren_count: totals.con_renew_count,
          con_ren_amt: totals.con_renew_amount,
          biz_count: totals.biz_count,
          biz_amt: totals.biz_amount,
          daily_count: totals.daily_new_count + totals.daily_renew_count,
          daily_amt: totals.daily_new_amount + totals.daily_renew_amount,
          loan_count: totals.loan_count,
          loan_amt: totals.loan_amount,
          cash: totals.cash_collection,
          deposit: totals.deposit_collection,
          collection: totals.submitted_collection,
          death: totals.death_settlement,
          balance: totals.submitted_balance,
          cash_balance: totals.submitted_cash_balance,
          expenses: totals.expenses,
          cash_in_hand: totals.cash_in_hand,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      flash(
        "success",
        `✓ Branch Day End submitted for ${selectedBranch} on ${selectedDate}`,
      );
      setConfirmOpen(false);
      // Reload the report to show updated status
      await loadReport();
    } catch (err: any) {
      flash("error", err.message || "Failed to submit branch day end");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };
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
            {r.executive}
          </div>
          <div className="space-y-1.5">
            {[
              ["Total Loan Amt", fmt(r.loan_amount)],
              ["Cash Collected", fmt(r.cash_collection)],
              ["Online / CDK", fmt(r.deposit_collection)],
              ["Submit Balance", fmt(r.submitted_balance)],
              ["Cash Balance", fmt(r.submitted_cash_balance)],
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
  // Check if can submit
  // Conditions:
  // 1. There are rows (executives) in the report
  // 2. Branch day end doesn't already exist
  // 3. All executives have submitted their individual reports
  // 4. User has permission (admin, regional, or branch manager)
  // 5. Not viewing "All Branches"
  const canSubmit =
    selectedBranch !== ALL_BRANCHES &&
    rows.length > 0 &&
    !branchDayEndExists &&
    allSubmitted &&
    (isAdmin || isRegional || isBranchManager);

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
            <Building2 size={18} className="text-primary" />
            {selectedBranch === ALL_BRANCHES
              ? `All Branches Report for ${selectedDate}`
              : `Branch Report for ${selectedBranch} on ${selectedDate}`}
          </CardTitle>
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
                    <span className="text-xs text-gray-400">total</span>
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
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            {/* Date - All users can select date */}
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

            {/* Branch - All users can select branch (with role-based options) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Select Branch
              </Label>
              <SearchableSelect
                options={branchOptions}
                value={selectedBranch}
                onChange={setSelectedBranch}
                placeholder={
                  dropLoading ? "Loading branches..." : "Select Branch"
                }
                disabled={dropLoading}
              />
              {selectedBranch === ALL_BRANCHES && (
                <p className="text-xs text-amber-600">
                  Note: Branch day end can only be submitted for individual
                  branches, not "All Branches"
                </p>
              )}
            </div>

            {/* Button - All users need to click "View Report" (except branch managers who auto-load) */}
            <Button
              onClick={loadReport}
              className="h-11 gap-2 bg-primary hover:bg-primary/90"
              disabled={loading || !selectedBranch || !selectedDate}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  View Report
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

      {/* Branch Day End Status - Only show for individual branches */}
      {selectedBranch !== ALL_BRANCHES && branchDayEndExists && submitTime && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              ✓ Branch Day End already submitted for{" "}
              <strong>{selectedBranch}</strong> at{" "}
              <strong>
                {submitTime
                  ? new Date(submitTime).toLocaleString("en-US", {
                      timeZone: "UTC",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : ""}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Pending Status - Show when not all executives have submitted */}
      {selectedBranch !== ALL_BRANCHES &&
        !branchDayEndExists &&
        !allSubmitted &&
        rows.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                ⏳ Waiting for all executives to submit their individual reports
              </p>
              <p className="text-xs text-amber-600">
                {rows.filter((r) => r.status !== "Submitted").length} out of{" "}
                {rows.length} executives haven't submitted yet
              </p>
            </div>
          </div>
        )}

      {/* Report Table */}
      {!loading && rows.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                {selectedBranch === ALL_BRANCHES
                  ? `All Branches Report for ${selectedDate}`
                  : `Branch Report for ${selectedBranch} on ${selectedDate}`}
              </CardTitle>
              {selectedBranch !== ALL_BRANCHES && canSubmit && (
                <Button
                  className="gap-2 bg-amber-500 hover:bg-amber-600 h-9 text-sm"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Send className="w-4 h-4" />
                  Submit Branch Day-End
                </Button>
              )}
              {selectedBranch !== ALL_BRANCHES &&
                !canSubmit &&
                rows.length > 0 &&
                !branchDayEndExists &&
                !allSubmitted && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 px-3 py-1.5">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Cannot submit — Pending executive submissions
                  </Badge>
                )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1800px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center w-8 text-xs"
                      >
                        #
                      </TableHead>

                      {selectedBranch === ALL_BRANCHES && (
                        <TableHead
                          rowSpan={3}
                          className="border border-gray-200 text-center text-xs"
                        >
                          Branch
                        </TableHead>
                      )}
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Executive
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Float Amount
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-green-100 text-xs"
                      >
                        Excess Payment
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Centers Today
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Active Customers
                      </TableHead>
                      {/* <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Case 1
                      </TableHead> */}
                      <TableHead
                        colSpan={4}
                        className="border border-gray-200 text-center bg-orange-100 text-xs"
                      >
                        Consumer Loans
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-red-100 text-xs"
                      >
                        Business Loans
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <TableHead
                          colSpan={2}
                          className="border border-gray-200 text-center bg-purple-100 text-xs"
                        >
                          Daily Loan
                        </TableHead>
                      )}
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-green-100 text-xs"
                      >
                        Total Loan
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-blue-100 text-xs "
                      >
                        Submitted Collection
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-purple-100 text-xs"
                      >
                        Submitted Total Collection
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-gray-200 text-xs"
                      >
                        Death Settlement
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-blue-200 text-xs"
                      >
                        Expenses
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-teal-100 text-xs"
                      >
                        Submitted Balance
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-teal-100 text-xs"
                      >
                        Submitted Cash Balance
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center bg-cyan-100 text-xs"
                      >
                        Cash In Hand
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Submit
                      </TableHead>
                      <TableHead
                        rowSpan={3}
                        className="border border-gray-200 text-center text-xs"
                      >
                        Submit Time
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-orange-200 text-xs"
                      >
                        New
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-orange-200 text-xs"
                      >
                        Renew
                      </TableHead>
                      <TableHead
                        colSpan={2}
                        className="border border-gray-200 text-center bg-red-200 text-xs"
                      >
                        New+Renew
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <TableHead
                          colSpan={2}
                          className="border border-gray-200 text-center bg-purple-200 text-xs"
                        >
                          New+Renew
                        </TableHead>
                      )}
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-green-200 text-xs"
                      >
                        Count
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-green-200 text-xs"
                      >
                        Amount
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-blue-200 text-xs"
                      >
                        Cash
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className="border border-gray-200 text-center bg-blue-200 text-xs"
                      >
                        CDK/Online
                      </TableHead>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableHead className="border border-gray-200 text-center bg-orange-300 text-xs">
                        Count
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-orange-300 text-xs">
                        Amount
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-orange-300 text-xs">
                        Count
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-orange-300 text-xs">
                        Amount
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-red-300 text-xs">
                        Count
                      </TableHead>
                      <TableHead className="border border-gray-200 text-center bg-red-300 text-xs">
                        Amount
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <>
                          <TableHead className="border border-gray-200 text-center bg-purple-300 text-xs">
                            Count
                          </TableHead>
                          <TableHead className="border border-gray-200 text-center bg-purple-300 text-xs">
                            Amount
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const isSubmitted = row.status === "Submitted";
                      return (
                        <TableRow
                          key={idx}
                          className={`cursor-pointer transition-colors ${isSubmitted ? "bg-green-100 hover:bg-green-50" : "bg-red-100 hover:bg-red-50"}`}
                          onClick={() =>
                            window.open(
                              `/dashboard/day-end-report?bname=${encodeURIComponent(selectedBranch !== ALL_BRANCHES ? selectedBranch : "")}&name=${encodeURIComponent(row.executive)}&date=${encodeURIComponent(selectedDate)}`,
                              "_blank",
                            )
                          }
                          onMouseMove={(e) =>
                            setTooltip({ x: e.clientX, y: e.clientY, row })
                          }
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {" "}
                          <TableCell className="text-center text-xs text-gray-500 font-mono">
                            {idx + 1}
                          </TableCell>
                          {selectedBranch === ALL_BRANCHES && (
                            <TableCell className="text-xs">
                              {/* This assumes your API returns branch name in the executive field or as a separate field */}
                              {/* You'll need to adjust based on your API response */}
                              {row.executive.split(" - ")[0] || ""}
                            </TableCell>
                          )}
                          <TableCell className="text-xs">
                            {selectedBranch === ALL_BRANCHES
                              ? row.executive.split(" - ")[1] || row.executive
                              : row.executive}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.plot)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.access_payment)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.centers_today}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.active_customers}
                          </TableCell>
                          {/* <TableCell className="text-center text-xs">
                            {row.case_1}
                          </TableCell> */}
                          <TableCell className="text-center text-xs">
                            {row.con_new_count}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.con_new_amount)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.con_renew_count}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.con_renew_amount)}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {row.biz_count}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.biz_amount)}
                          </TableCell>
                          {FEATURES.DAILY_LOAN_ENABLED && (
                            <>
                              <TableCell className="text-center text-xs">
                                {row.daily_new_count + row.daily_renew_count}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {fmt(
                                  row.daily_new_amount + row.daily_renew_amount,
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-center text-xs font-semibold">
                            {row.loan_count}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {fmt(row.loan_amount)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.cash_collection)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.deposit_collection)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {fmt(row.submitted_collection)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.death_settlement)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {fmt(row.expenses)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {fmt(row.submitted_balance)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {fmt(row.submitted_cash_balance)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {fmt(row.cash_in_hand)}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.status === "Submitted" ? (
                              <Badge className="bg-green-100 text-green-700 border-0">
                                Yes
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-0">
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
                        <TableCell
                          colSpan={selectedBranch === ALL_BRANCHES ? 3 : 2}
                        >
                          Total
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.plot)}
                        </TableCell>
                        <TableCell className="text-right text-xs bg-green-50">
                          {fmt(totals.access_payment)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.centers_today}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.active_customers}
                        </TableCell>
                        {/* <TableCell className="text-center text-xs">
                          {totals.case_1}
                        </TableCell> */}
                        <TableCell className="text-center text-xs">
                          {totals.con_new_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.con_new_amount)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.con_renew_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.con_renew_amount)}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {totals.biz_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.biz_amount)}
                        </TableCell>
                        {FEATURES.DAILY_LOAN_ENABLED && (
                          <>
                            <TableCell className="text-center text-xs">
                              {totals.daily_new_count +
                                totals.daily_renew_count}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {fmt(
                                totals.daily_new_amount +
                                  totals.daily_renew_amount,
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-center text-xs">
                          {totals.loan_count}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(totals.loan_amount)}
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
                          {fmt(totals.submitted_cash_balance)}
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
      {!loading && rows.length === 0 && selectedBranch && (
        <div className="flex flex-col items-center gap-3 text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">No data found</p>
          <p className="text-xs text-gray-400">
            No executive data for{" "}
            {selectedBranch === ALL_BRANCHES ? "any branch" : selectedBranch} on{" "}
            {selectedDate}.
          </p>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Submit Branch Day-End Report
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-gray-600">
            <p>
              Submit branch day-end report for <strong>{selectedBranch}</strong>{" "}
              on <strong>{selectedDate}</strong>?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Total Float:</span>
                <span className="font-semibold">
                  Rs. {totals?.plot ? fmt(totals.plot) : "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Collection:</span>
                <span className="font-semibold">
                  Rs.{" "}
                  {totals?.submitted_collection
                    ? fmt(totals.submitted_collection)
                    : "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Balance:</span>
                <span className="font-semibold">
                  Rs.{" "}
                  {totals?.submitted_balance
                    ? fmt(totals.submitted_balance)
                    : "0"}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-medium">Cash In Hand:</span>
                <span
                  className={`font-bold ${(totals?.cash_in_hand || 0) < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  Rs. {totals?.cash_in_hand ? fmt(totals.cash_in_hand) : "0"}
                </span>
              </div>
            </div>
            <p className="text-xs text-amber-600">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 gap-2"
              onClick={handleSubmitBranchDayEnd}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchTab;
