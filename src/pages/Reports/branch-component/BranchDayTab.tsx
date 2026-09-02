import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { fetchBranches, Branch } from "@/lib/branchHelpers";

const ALL_BRANCHES = "__all__"; // Sentinel value for "All Branches"

interface SelectOption {
  label: string;
  value: string;
  sub?: string;
}

interface BranchDayTotal {
  float_amount: number;
  access_payment: number;
  centers_today: number;
  active_customers: number;
  case_1: number;
  consumer_new_count: number;
  consumer_new_amount: number;
  consumer_renew_count: number;
  consumer_renew_amount: number;
  business_count: number;
  business_amount: number;
  daily_total_count: number;
  daily_total_amount: number;
  total_loan_count: number;
  total_loan_amount: number;
  cash_collection: number;
  deposit_collection: number;
  total_collection: number;
  death_settlement: number;
  expenses: number;
  submitted_balance: number;
  submitted_cash_balance: number;
  cash_in_hand: number;
}

interface BranchStatus {
  status: "Submitted" | "Pending";
  submit_time: string | null;
}

interface BranchDayResponse {
  branch_totals: Record<string, BranchDayTotal>;
  branch_status: Record<string, BranchStatus>;
  grand_totals: BranchDayTotal;
  selected_date: string;
  selected_branch: string;
}

const fmt = (n: number) => Number(n).toLocaleString("en-LK");

const BranchDayTab = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isBranchManager = user?.status === "branch_manager";
  const isExecutive =
    user?.status === "executive" || user?.status === "manager";
  const FEATURES = {
    DAILY_LOAN_ENABLED: true, // Set to true when ready to release
  };
  // Filter state
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranch, setSelectedBranch] = useState<string>(ALL_BRANCHES); // Default to All Branches

  // Data state
  const [branchTotals, setBranchTotals] = useState<
    Record<string, BranchDayTotal>
  >({});
  const [branchStatus, setBranchStatus] = useState<
    Record<string, BranchStatus>
  >({});
  const [grandTotals, setGrandTotals] = useState<BranchDayTotal | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Branch options
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [accessibleBranches, setAccessibleBranches] = useState<string[]>([]);
  const [dropLoading, setDropLoading] = useState(false);

  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 5000);
    }
  };

  // Load accessible branches based on user role
  useEffect(() => {
    const loadAccessibleBranches = async () => {
      if (!user) return;
      setDropLoading(true);
      try {
        const branchesData = await fetchBranches({
          role: user.status,
          userId: user.id.toString(),
          bname: user.bname,
        });

        let allowedBranches: string[] = [];

        if (isBranchManager || isExecutive) {
          // Branch managers and executives see only their branch
          allowedBranches = [user.bname || ""];
        } else if (isRegional) {
          // Regional managers see assigned branches
          // This would need an API call to get their assigned branches
          // For now, use all branches
          allowedBranches = branchesData.map((b: Branch) => b.bname);
        } else {
          // Admin sees all branches
          allowedBranches = branchesData.map((b: Branch) => b.bname);
        }

        setAccessibleBranches(allowedBranches);

        // Set branch options for dropdown
        const options: SelectOption[] = allowedBranches.map((b) => ({
          label: b,
          value: b,
          sub: branchesData.find((bd: Branch) => bd.bname === b)?.bcode,
        }));

        // Add "All Branches" option at the beginning with sentinel value
        setBranchOptions([
          { label: "All Branches", value: ALL_BRANCHES },
          ...options,
        ]);
      } catch (error) {
        console.error("Error loading branches:", error);
      } finally {
        setDropLoading(false);
        setInitialLoad(false); // Branches loaded, now we can load report
      }
    };

    loadAccessibleBranches();
  }, [user, isBranchManager, isExecutive, isRegional]);

  // Load report on initial mount and when dependencies change
  useEffect(() => {
    // Don't load until branches are loaded and not in initial loading state
    if (!initialLoad && !dropLoading && selectedDate) {
      loadReport();
    }
  }, [selectedDate, selectedBranch, initialLoad, dropLoading]);

  // Load report
  const loadReport = useCallback(async () => {
    if (!selectedDate) return;
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
        params.set("branch", selectedBranch);
      }

      const res = await fetch(`${API.report.getBranchDayEndSummary}?${params}`);
      const data: BranchDayResponse = await res.json();

      //   if (!res.ok) throw new Error(data.error);

      setBranchTotals(data.branch_totals || {});
      setBranchStatus(data.branch_status || {});
      setGrandTotals(data.grand_totals || null);
    } catch (err: any) {
      flash("error", err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranch, user]);

  // Sort branches alphabetically
  const sortedBranches = Object.keys(branchTotals).sort();

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
            Branch Day End Summary
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
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    // Auto-load will happen via useEffect
                  }}
                  className="pl-9 h-11 bg-white border-gray-200"
                />
              </div>
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Select Branch
              </Label>
              {isBranchManager || isExecutive ? (
                <div className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {user?.bname}
                  </span>
                </div>
              ) : (
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                  disabled={dropLoading}
                >
                  <SelectTrigger className="h-11 bg-white border-gray-200">
                    <SelectValue
                      placeholder={
                        dropLoading ? "Loading branches..." : "Select a branch"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} {option.sub && `(${option.sub})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Button - Optional, can be removed if you want only auto-load */}
            <Button
              onClick={loadReport}
              className="h-11 gap-2 bg-primary hover:bg-primary/90"
              disabled={loading || !selectedDate}
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
      {!loading && sortedBranches.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              Branch Day End Summary for {selectedDate}
              {selectedBranch && selectedBranch !== ALL_BRANCHES
                ? ` — ${selectedBranch}`
                : " — All Branches"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto scrollbar-hidden">
              <div className="min-w-[1400px] sm:min-w-[2000px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FAA300] hover:bg-[#FAA300] text-xs">
                      <TableHead className="text-white font-semibold">
                        Branch
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Float
                      </TableHead>
                      <TableHead className="text-white font-semibold bg-green-600">
                        Excess Payment
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Centers
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Active
                      </TableHead>
                      {/* <TableHead className="text-white font-semibold">
                        Case 1
                      </TableHead> */}
                      <TableHead className="text-white font-semibold">
                        Con New
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Con New Amt
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Con Ren
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Con Ren Amt
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Biz Count
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Biz Amt
                      </TableHead>
                      {FEATURES.DAILY_LOAN_ENABLED && (
                        <>
                          <TableHead className="text-white font-semibold">
                            Daily Count
                          </TableHead>
                          <TableHead className="text-white font-semibold">
                            Daily Amt
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-white font-semibold">
                        Total Loans
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Total Loan Amt
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Cash
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        CDK/Online
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Total Collection
                      </TableHead>
                      <TableHead className="text-white font-semibold bg-purple-600">
                        Death Settlement
                      </TableHead>
                      <TableHead className="text-white font-semibold bg-blue-600">
                        Expenses
                      </TableHead>
                      <TableHead className="text-white font-semibold bg-teal-600">
                        Balance
                      </TableHead>
                      <TableHead className="text-white font-semibold bg-teal-600">
                        Cash Balance
                      </TableHead>
                      <TableHead className="text-white font-semibold bg-cyan-600">
                        Cash In Hand
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Status
                      </TableHead>
                      <TableHead className="text-white font-semibold">
                        Submit Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBranches.map((branch, idx) => {
                      const totals = branchTotals[branch];
                      const status = branchStatus[branch]?.status || "Pending";
                      const submitTime =
                        branchStatus[branch]?.submit_time || "";

                      return (
                        <TableRow
                          key={branch}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} text-xs`}
                        >
                          <TableCell className="font-bold">{branch}</TableCell>
                          <TableCell>{fmt(totals.float_amount)}</TableCell>
                          <TableCell className="bg-green-50">
                            {fmt(totals.access_payment)}
                          </TableCell>
                          <TableCell>{totals.centers_today}</TableCell>
                          <TableCell>{totals.active_customers}</TableCell>
                          {/* <TableCell>{totals.case_1}</TableCell> */}
                          <TableCell>{totals.consumer_new_count}</TableCell>
                          <TableCell>
                            {fmt(totals.consumer_new_amount)}
                          </TableCell>
                          <TableCell>{totals.consumer_renew_count}</TableCell>
                          <TableCell>
                            {fmt(totals.consumer_renew_amount)}
                          </TableCell>
                          <TableCell>{totals.business_count}</TableCell>
                          <TableCell>{fmt(totals.business_amount)}</TableCell>
                          {FEATURES.DAILY_LOAN_ENABLED && (
                            <>
                              <TableCell>{totals.daily_total_count}</TableCell>
                              <TableCell>
                                {fmt(totals.daily_total_amount)}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{totals.total_loan_count}</TableCell>
                          <TableCell>{fmt(totals.total_loan_amount)}</TableCell>
                          <TableCell>{fmt(totals.cash_collection)}</TableCell>
                          <TableCell>
                            {fmt(totals.deposit_collection)}
                          </TableCell>
                          <TableCell>{fmt(totals.total_collection)}</TableCell>
                          <TableCell className="bg-purple-50">
                            {fmt(totals.death_settlement)}
                          </TableCell>
                          <TableCell className="bg-blue-50">
                            {fmt(totals.expenses)}
                          </TableCell>
                          <TableCell className="bg-teal-50">
                            {fmt(totals.submitted_balance)}
                          </TableCell>
                          <TableCell className="bg-teal-50">
                            {fmt(totals.submitted_cash_balance)}
                          </TableCell>
                          <TableCell className="bg-cyan-50">
                            {fmt(totals.cash_in_hand)}
                          </TableCell>
                          <TableCell>
                            {status === "Submitted" ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Submitted
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {submitTime
                              ? new Date(submitTime).toLocaleString("en-US", {
                                  timeZone: "UTC",
                                  month: "numeric",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: true,
                                })
                              : ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Grand Totals Row */}
                    {grandTotals && (
                      <TableRow className="bg-amber-50 font-bold border-t-2 border-amber-300 text-xs">
                        <TableCell>GRAND TOTAL</TableCell>
                        <TableCell>{fmt(grandTotals.float_amount)}</TableCell>
                        <TableCell className="bg-green-50">
                          {fmt(grandTotals.access_payment)}
                        </TableCell>
                        <TableCell>{grandTotals.centers_today}</TableCell>
                        <TableCell>{grandTotals.active_customers}</TableCell>
                        {/* <TableCell>{grandTotals.case_1}</TableCell> */}
                        <TableCell>{grandTotals.consumer_new_count}</TableCell>
                        <TableCell>
                          {fmt(grandTotals.consumer_new_amount)}
                        </TableCell>
                        <TableCell>
                          {grandTotals.consumer_renew_count}
                        </TableCell>
                        <TableCell>
                          {fmt(grandTotals.consumer_renew_amount)}
                        </TableCell>
                        <TableCell>{grandTotals.business_count}</TableCell>
                        <TableCell>
                          {fmt(grandTotals.business_amount)}
                        </TableCell>
                        {FEATURES.DAILY_LOAN_ENABLED && (
                          <>
                            <TableCell>
                              {grandTotals.daily_total_count}
                            </TableCell>
                            <TableCell>
                              {fmt(grandTotals.daily_total_amount)}
                            </TableCell>
                          </>
                        )}
                        <TableCell>{grandTotals.total_loan_count}</TableCell>
                        <TableCell>
                          {fmt(grandTotals.total_loan_amount)}
                        </TableCell>
                        <TableCell>
                          {fmt(grandTotals.cash_collection)}
                        </TableCell>
                        <TableCell>
                          {fmt(grandTotals.deposit_collection)}
                        </TableCell>
                        <TableCell>
                          {fmt(grandTotals.total_collection)}
                        </TableCell>
                        <TableCell className="bg-purple-50">
                          {fmt(grandTotals.death_settlement)}
                        </TableCell>
                        <TableCell className="bg-blue-50">
                          {fmt(grandTotals.expenses)}
                        </TableCell>
                        <TableCell className="bg-teal-50">
                          {fmt(grandTotals.submitted_balance)}
                        </TableCell>
                        <TableCell className="bg-teal-50">
                          {fmt(grandTotals.submitted_cash_balance)}
                        </TableCell>
                        <TableCell className="bg-cyan-50">
                          {fmt(grandTotals.cash_in_hand)}
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

      {/* Empty state */}
      {!loading && sortedBranches.length === 0 && (
        <div className="flex flex-col items-center gap-3 text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">No records found</p>
          <p className="text-xs text-gray-400">
            No branch day end records found for {selectedDate}.
          </p>
        </div>
      )}
    </div>
  );
};

export default BranchDayTab;
