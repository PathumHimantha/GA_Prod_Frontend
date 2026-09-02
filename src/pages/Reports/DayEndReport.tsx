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
  Receipt,
  Eye,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { API } from "@/apiConfig";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { getActiveUsers, User } from "@/lib/userHelpers";
import SearchableSelect from "@/components/SearchableSelect";
import { useNavigate } from "react-router-dom";
interface SelectOption {
  label: string;
  value: string;
  sub?: string;
}

interface DayEndRow {
  ccode: string;
  center: string;
  active: number;
  case_1: number;
  con_new_count: number;
  con_new_amount: number;
  con_renew_count: number;
  con_renew_amount: number;
  biz_new_count: number;
  biz_new_amount: number;
  biz_renew_count: number;
  biz_renew_amount: number;
  daily_new_count: number; // ← add
  daily_new_amount: number; // ← add
  daily_renew_count: number; // ← add
  daily_renew_amount: number; // ← add
  doc_fee: number;
  ins_fee: number;
  cash_amount: number;
  dep_amount: number;
  death_amount: number;
}

interface ExpenseRow {
  id: number;
  category: string;
  description: string;
  added_by: string;
  amount: number;
}

interface ApiResponse {
  rows: DayEndRow[];
  submitted: boolean;
  expenses: ExpenseRow[];
  totalExpenses: number;
  plotAmount: number;
  branchTotals: {
    active: number;
    con_new_count: number;
    con_new_amount: number;
    con_renew_count: number;
    con_renew_amount: number;
    biz_new_count: number;
    biz_new_amount: number;
    biz_renew_count: number;
    biz_renew_amount: number;
    daily_new_count: number; // ← add
    daily_new_amount: number; // ← add
    daily_renew_count: number; // ← add
    daily_renew_amount: number; // ← add
    doc_fee: number;
    ins_fee: number;
    cash_amount: number;
    dep_amount: number;
    death_amount: number;
  };
  branchBalance: number;
  branchCashBalance: number;
  cashInHand: number;
}

const fmt = (n: number) => Number(n).toLocaleString("en-LK");

const Th = ({
  children,
  className = "",
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
}) => (
  <th
    rowSpan={rowSpan}
    colSpan={colSpan}
    className={`px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 ${className}`}
  >
    {children}
  </th>
);
const Td = ({
  children,
  className = "",
  colSpan,
  rowSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) => (
  <td
    colSpan={colSpan}
    rowSpan={rowSpan}
    className={`px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200 ${className}`}
  >
    {children}
  </td>
);

const DayEndReport = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();
  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isBranchManager = user?.status === "branch_manager";
  const isExecutive =
    user?.status === "executive" || user?.status === "manager";

  // For branch_manager/executive: fixed values. For others: selectable
  const [date, setDate] = useState(today);
  const [bname, setBname] = useState(
    isBranchManager || isExecutive ? user?.bname || "" : "",
  );
  const [execName, setExecName] = useState(
    isBranchManager || isExecutive ? user?.name || "" : "",
  );

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [rows, setRows] = useState<DayEndRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New state for backend-calculated values
  const [branchBalance, setBranchBalance] = useState(0);
  const [branchCashBalance, setBranchCashBalance] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);
  const [plotAmount, setPlotAmount] = useState(0);
  const [excessPayments, setExcessPayments] = useState<any[]>([]);
  const [totalExcess, setTotalExcess] = useState(0);
  const [missingGuarantors, setMissingGuarantors] = useState<any[]>([]);
  const [hasFloat, setHasFloat] = useState(true);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyDialogLoading, setCopyDialogLoading] = useState(false);
  const [originalMessage, setOriginalMessage] = useState("");
  const [editedMessage, setEditedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  // ── Feature flags ──────────────────────────────────────────
  const FEATURES = {
    DAILY_LOAN_ENABLED: true, // Set to true when ready to release
  };
  // ── Read URL params ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBname = params.get("bname");
    const urlName = params.get("name");
    const urlUserid = params.get("userid");

    if (urlBname && urlName) {
      setBname(urlBname);
      setExecName(urlName);
      // trigger report load after state settles
    }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBname = params.get("bname");
    const urlName = params.get("name");

    if (urlBname && urlName && bname === urlBname && execName === urlName) {
      loadReport();
    }
  }, [bname, execName]);
  const loadHelpingDetails = async (
    date: string,
    name: string,
    bname: string,
  ) => {
    try {
      const params = new URLSearchParams({ date, name, bname });
      const res = await fetch(`${API.report.dayEndHelpingDetails}?${params}`);
      const data = await res.json();
      if (res.ok) {
        setPlotAmount(data.plotAmount || 0);
        setHasFloat(data.hasFloat ?? true);
        setExcessPayments(data.excessPayments || []);
        setTotalExcess(data.totalExcess || 0);
      }
    } catch (err) {
      console.error("Failed to load helping details", err);
    }
  };

  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 5000);
    }
  };

  // Load branches + users
  useEffect(() => {
    if (!user) return;

    fetchBranches({
      role: user.status,
      userId: user.id.toString(),
      bname: user.bname, // Make sure this is passed correctly
    })
      .then((branches: Branch[]) => {
        console.log("Fetched branches:", branches); // Debug log
        setBranchOptions(
          branches.map((b) => ({
            label: b.bname,
            value: b.bname,
            sub: b.bcode,
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to fetch branches:", err);
      });

    getActiveUsers().then(setAllUsers);
  }, [user]);

  const execOptions: SelectOption[] = allUsers
    .filter((u) => {
      const role = (u.role || u.status || "").toLowerCase();

      const allowedRoles = ["executive", "branch_manager", "admin"];
      if (!allowedRoles.includes(role)) return false;

      if (!bname) return false;

      // Special case: For NARAMMALA branch, show executives from KEGALLE
      if (bname?.toUpperCase() === "NARAMMALA") {
        return u.bname?.toUpperCase() === "KEGALLE";
      }

      // Special case: For KEGALLE branch, show executives from both KEGALLE and NARAMMALA
      if (bname?.toUpperCase() === "KEGALLE") {
        return (
          u.bname?.toUpperCase() === "KEGALLE" ||
          u.bname?.toUpperCase() === "NARAMMALA"
        );
      }

      return u.bname?.toLowerCase() === bname?.toLowerCase();
    })
    .map((u) => ({ label: u.name, value: u.name, sub: u.bname }));
  const loadReport = useCallback(async () => {
    if (!date || !bname || !execName) return;
    setLoading(true);
    setRows([]);
    setExpenses([]);
    try {
      const params = new URLSearchParams({
        date,
        bname,
        role: user?.status || "",
        user_name: execName,
      });
      const res = await fetch(`${API.report.getDayEnd}?${params}`);
      const data: ApiResponse = await res.json();
      // if (!res.ok) throw new Error(data.error);
      await loadHelpingDetails(date, execName, bname);
      setRows(data.rows || []);
      setExpenses(data.expenses || []);
      setTotalExpenses(data.totalExpenses || 0);
      setSubmitted(data.submitted || false);

      // Set the backend-calculated values
      setBranchBalance(data.branchBalance || 0);
      setBranchCashBalance(data.branchCashBalance || 0);
      setCashInHand(data.cashInHand || 0);
      setPlotAmount(data.plotAmount || 0);
    } catch (err: any) {
      flash("error", err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [date, bname, execName, user]);

  // Auto-load for branch_manager/executive
  // Auto-load for branch_manager/executive
  useEffect(() => {
    if ((isBranchManager || isExecutive) && date && bname && execName) {
      loadReport();
    }
  }, [date, bname]); // Add bname as dependency

  // Totals for the table only (calculated from rows)
  const tableTotals = rows.reduce(
    (acc, r) => ({
      active: acc.active + Number(r.active),
      case_1: acc.case_1 + Number(r.case_1),
      con_new_count: acc.con_new_count + Number(r.con_new_count),
      con_new_amount: acc.con_new_amount + Number(r.con_new_amount),
      con_renew_count: acc.con_renew_count + Number(r.con_renew_count),
      con_renew_amount: acc.con_renew_amount + Number(r.con_renew_amount),
      biz_new_count: acc.biz_new_count + Number(r.biz_new_count),
      biz_new_amount: acc.biz_new_amount + Number(r.biz_new_amount),
      biz_renew_count: acc.biz_renew_count + Number(r.biz_renew_count),
      biz_renew_amount: acc.biz_renew_amount + Number(r.biz_renew_amount),
      daily_new_count: acc.daily_new_count + Number(r.daily_new_count), // ← add
      daily_new_amount: acc.daily_new_amount + Number(r.daily_new_amount), // ← add
      daily_renew_count: acc.daily_renew_count + Number(r.daily_renew_count), // ← add
      daily_renew_amount: acc.daily_renew_amount + Number(r.daily_renew_amount), // ← add
      doc_fee: acc.doc_fee + Number(r.doc_fee),
      ins_fee: acc.ins_fee + Number(r.ins_fee),
      cash_amount: acc.cash_amount + Number(r.cash_amount),
      dep_amount: acc.dep_amount + Number(r.dep_amount),
      death_amount: acc.death_amount + Number(r.death_amount),
    }),
    {
      active: 0,
      case_1: 0,
      con_new_count: 0,
      con_new_amount: 0,
      con_renew_count: 0,
      con_renew_amount: 0,
      biz_new_count: 0,
      biz_new_amount: 0,
      biz_renew_count: 0,
      biz_renew_amount: 0,
      daily_new_count: 0, // ← add
      daily_new_amount: 0, // ← add
      daily_renew_count: 0, // ← add
      daily_renew_amount: 0, // ← add
      doc_fee: 0,
      ins_fee: 0,
      cash_amount: 0,
      dep_amount: 0,
      death_amount: 0,
    },
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setMissingGuarantors([]);
    try {
      const res = await fetch(API.report.submitDayEnd, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          name: execName,
          bname,
          totalExpenses,
          cashInHand,
          balance: branchBalance,
          plotAmount,
          totalExcess,
          collection: tableTotals.cash_amount + tableTotals.dep_amount,
          newloan:
            tableTotals.con_new_amount +
            tableTotals.biz_new_amount +
            tableTotals.daily_new_amount,
          totalnewloancount:
            tableTotals.con_new_count +
            tableTotals.biz_new_count +
            tableTotals.daily_new_count,
          totalrenewloans:
            tableTotals.con_renew_amount +
            tableTotals.biz_renew_amount +
            tableTotals.daily_renew_amount,
          totalrenewloancount:
            tableTotals.con_renew_count +
            tableTotals.biz_renew_count +
            tableTotals.daily_renew_count,
          totalextrapayment: 0,
          totalloans:
            tableTotals.con_new_amount +
            tableTotals.biz_new_amount +
            tableTotals.con_renew_amount +
            tableTotals.biz_renew_amount +
            tableTotals.daily_new_amount +
            tableTotals.daily_renew_amount,
          death_settlement: tableTotals.death_amount,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.missing_guarantors && json.missing_guarantors.length > 0) {
          setMissingGuarantors(json.missing_guarantors);
          setConfirmOpen(false);
          return;
        }
        throw new Error(json.error);
      }
      flash("success", json.message);
      setSubmitted(true);
      setConfirmOpen(false);
    } catch (err: any) {
      flash("error", err.message);
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };
  const canSubmit =
    rows.length > 0 &&
    !submitted &&
    cashInHand >= 0 &&
    hasFloat && // ← block submit if no float entered
    (isBranchManager || isAdmin || isRegional || isExecutive);

  // Check if user is a KEGALLE executive (should have access to both KEGALLE and NARAMMALA)
  const isKegalleExecutive =
    isExecutive && user?.bname?.toUpperCase() === "KEGALLE";
  const isKegalleManager =
    isBranchManager && user?.bname?.toUpperCase() === "KEGALLE";

  // Show branch dropdown for: Admin, Regional, KEGALLE Branch Manager, or KEGALLE Executive
  const showFilters =
    isAdmin || isRegional || isKegalleManager || isKegalleExecutive;

  // Show executive dropdown ONLY for Admins, Regional Managers, and KEGALLE Branch Managers
  // KEGALLE Executives should NOT see executive dropdown (locked to their own name)
  const showExecDropdown = isAdmin || isRegional || isKegalleManager;

  const handleSendWhatsApp = async () => {
    // ✅ Open the window immediately, synchronously, on click —
    // before any await — so the browser doesn't block it as a popup.
    const waWindow = window.open("", "_blank");
    if (waWindow) {
      waWindow.document.write(
        `<!doctype html>
       <html>
         <head><title>Redirecting to WhatsApp…</title></head>
         <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f9fafb;color:#6b7280;">
           <p>Redirecting to WhatsApp…</p>
         </body>
       </html>`,
      );
    }

    setWaDialogOpen(true);

    try {
      const params = new URLSearchParams({ date, bname, name: execName });
      const res = await fetch(`${API.helper.buildCashMessage}?${params}`);
      const data = await res.json();

      if (!res.ok) {
        flash("error", data.error || "Failed to build message");
        if (waWindow) waWindow.close();
        return;
      }

      const encoded = encodeURIComponent(data.message);
      if (waWindow) {
        waWindow.location.href = `https://wa.me/?text=${encoded}`;
      } else {
        flash(
          "error",
          "Popup blocked — please allow popups for this site and try again.",
        );
      }
    } catch {
      flash("error", "Cannot connect to server");
      if (waWindow) waWindow.close();
    } finally {
      setWaDialogOpen(false);
    }
  };
  const handleOpenCopyMessage = async () => {
    setCopyDialogOpen(true);
    setCopyDialogLoading(true);
    setCopied(false);
    try {
      const params = new URLSearchParams({ date, bname, name: execName });
      const res = await fetch(`${API.helper.buildCashMessage}?${params}`);
      const data = await res.json();

      if (!res.ok) {
        flash("error", data.error || "Failed to build message");
        setCopyDialogOpen(false);
        return;
      }

      setOriginalMessage(data.message);
      setEditedMessage(data.message);
    } catch {
      flash("error", "Cannot connect to server");
      setCopyDialogOpen(false);
    } finally {
      setCopyDialogLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      flash("error", "Failed to copy — please copy manually");
    }
  };

  const handleResetMessage = () => {
    setEditedMessage(originalMessage);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Day End Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Centre-wise summary for selected date and branch
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">{today}</span>
          </div>
        </div>

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
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Report Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 h-11 bg-white border-gray-200"
                  />
                </div>
              </div>

              {/* Branch */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Branch
                </Label>
                {!showFilters ? (
                  <div className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {bname}
                    </span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={branchOptions}
                    value={bname}
                    onChange={(v) => {
                      setBname(v);
                      if (!isKegalleExecutive) {
                        setExecName("");
                      }
                      setRows([]);
                    }}
                    placeholder="Select Branch"
                  />
                )}
              </div>

              {/* Executive */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Executive
                </Label>
                {!showExecDropdown ? (
                  <div className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {execName}
                    </span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={execOptions}
                    value={execName}
                    onChange={setExecName}
                    placeholder={
                      bname ? "Search executive..." : "Select branch first"
                    }
                    disabled={!bname}
                  />
                )}
              </div>

              {/* Button */}
              <Button
                onClick={loadReport}
                className="h-11 gap-2 bg-primary hover:bg-primary/90"
                disabled={loading || !bname || !date || !execName}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate
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
                  {bname} Branch — {execName} — {date}
                  {submitted && (
                    <Badge className="bg-green-100 text-green-700 border-0 ml-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Submitted
                    </Badge>
                  )}
                </CardTitle>
                {/* {canSubmit && (
                  <Button
                    className="gap-2 bg-amber-500 hover:bg-amber-600 h-9 text-sm"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Send className="w-4 h-4" />
                    Submit {bname} Day-End Report
                  </Button>
                )} */}
                {canSubmit && (
                  <Button
                    className="gap-2 bg-amber-500 hover:bg-amber-600 h-9 text-sm"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Send className="w-4 h-4" />
                    Submit {bname} Day-End Report
                  </Button>
                )}
                {submitted && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 h-9 text-sm border-black-400 text-white hover:bg-green-50 bg-green-500"
                      onClick={handleOpenCopyMessage}
                    >
                      <Copy className="w-4 h-4" />
                      Copy Message
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 h-9 text-sm border-black-400 text-white hover:bg-green-50 bg-green-500"
                      onClick={handleSendWhatsApp}
                    >
                      <Send className="w-4 h-4" />
                      Send via WhatsApp
                    </Button>
                  </div>
                )}
                {!canSubmit &&
                  rows.length > 0 &&
                  cashInHand < 0 &&
                  !submitted && (
                    <Badge className="bg-red-100 text-red-700 border-0 px-3 py-1.5">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Cannot submit — Negative cash in hand (Rs.{" "}
                      {fmt(cashInHand)})
                    </Badge>
                  )}
                {!canSubmit && rows.length > 0 && !hasFloat && !submitted && (
                  <Badge className="bg-red-100 text-red-700 border-0 px-3 py-1.5">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Cannot submit — No float entered for {execName} on {date}
                  </Badge>
                )}
                {missingGuarantors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Cannot submit — missing guarantor details
                    </div>
                    <ul className="space-y-1 text-sm text-red-600 list-disc list-inside">
                      {missingGuarantors.map((g, i) => (
                        <li key={i}>
                          {g.message}{" "}
                          <span className="text-xs text-gray-500 font-mono">
                            ({g.loan_code})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Plot & Excess Summary */}
              {(plotAmount >= 0 || totalExcess >= 0) && (
                <div className="p-4 bg-blue-50 border-t border-blue-200 flex flex-col sm:flex-row gap-3 text-sm flex-wrap">
                  {!hasFloat ? (
                    <span className="font-semibold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      No float entered for {execName} on {date} — submission
                      disabled
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-700">
                      Plot Amount ({execName}):{" "}
                      <span className="text-blue-600">Rs. {plotAmount}.00</span>
                    </span>
                  )}
                  {plotAmount >= 0 && totalExcess >= 0 && (
                    <span className="hidden sm:block text-gray-300">|</span>
                  )}
                  {totalExcess >= 0 && (
                    <span className="font-semibold text-gray-700">
                      {execName} Excess Payment:{" "}
                      <span className="text-green-600">
                        Rs. ({totalExcess}).00
                      </span>
                    </span>
                  )}
                </div>
              )}
              {/* Fixed: Added horizontal scroll container */}
              <div className="w-full overflow-x-auto">
                <div className="min-w-[1600px]">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <Th className="bg-gray-700" rowSpan={2}>
                          Center NO
                        </Th>
                        <Th className="bg-gray-700" rowSpan={2}>
                          View
                        </Th>
                        <Th className="bg-gray-700" rowSpan={2}>
                          Center Name
                        </Th>
                        <Th className="bg-gray-700" rowSpan={2}>
                          Active
                        </Th>
                        {/* <Th className="bg-gray-700" rowSpan={2}>
                          Case 1
                        </Th> */}
                        <Th className="bg-orange-500" colSpan={4}>
                          Consumer Loan
                        </Th>
                        <Th className="bg-red-700" colSpan={4}>
                          Business Loan
                        </Th>
                        {FEATURES.DAILY_LOAN_ENABLED && (
                          <Th className="bg-purple-600" colSpan={4}>
                            Daily Loan
                          </Th>
                        )}
                        <Th className="bg-green-600" colSpan={2}>
                          Total Loan
                        </Th>
                        <Th className="bg-teal-600" colSpan={2}>
                          Fees
                        </Th>
                        <Th className="bg-blue-600" colSpan={3}>
                          Collection
                        </Th>
                        <Th className="bg-purple-700" rowSpan={2}>
                          Death
                        </Th>
                      </tr>
                      <tr>
                        <Th className="bg-orange-400">New Cnt</Th>
                        <Th className="bg-orange-400">New Amt</Th>
                        <Th className="bg-orange-400">Renew Cnt</Th>
                        <Th className="bg-orange-400">Renew Amt</Th>
                        <Th className="bg-red-600">New Cnt</Th>
                        <Th className="bg-red-600">New Amt</Th>
                        <Th className="bg-red-600">Renew Cnt</Th>
                        <Th className="bg-red-600">Renew Amt</Th>
                        {FEATURES.DAILY_LOAN_ENABLED && (
                          <>
                            <Th className="bg-purple-500">New Cnt</Th>
                            <Th className="bg-purple-500">New Amt</Th>
                            <Th className="bg-purple-500">Renew Cnt</Th>
                            <Th className="bg-purple-500">Renew Amt</Th>
                          </>
                        )}
                        <Th className="bg-green-500">Count</Th>
                        <Th className="bg-green-500">Amount</Th>
                        <Th className="bg-teal-500">Doc Fee</Th>
                        <Th className="bg-teal-500">Ins Fee</Th>
                        <Th className="bg-blue-500">Cash</Th>
                        <Th className="bg-blue-500">CDK/Online</Th>
                        <Th className="bg-blue-500">Total</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const tc =
                          r.con_new_count +
                          r.con_renew_count +
                          r.biz_new_count +
                          r.biz_renew_count +
                          (FEATURES.DAILY_LOAN_ENABLED
                            ? r.daily_new_count + r.daily_renew_count
                            : 0);

                        const ta =
                          r.con_new_amount +
                          r.con_renew_amount +
                          r.biz_new_amount +
                          r.biz_renew_amount +
                          (FEATURES.DAILY_LOAN_ENABLED
                            ? r.daily_new_amount + r.daily_renew_amount
                            : 0);

                        return (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <Td className="text-gray-600 font-mono">
                              {r.ccode}
                            </Td>
                            <Td>
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    date,
                                    branch: bname,
                                    exec: execName,
                                    center: r.center,
                                  });
                                  window.open(
                                    `/dashboard/center-payments-report?${params.toString()}`,
                                    "_blank",
                                  );
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue/10 hover:bg-blue/20 text-blue transition-colors"
                                title={`View ${r.center} in Center Payments`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Td>
                            <Td className="text-left text-gray-800 font-medium">
                              {r.center}
                            </Td>
                            <Td>{r.active}</Td>
                            <Td>{r.con_new_count}</Td>
                            <Td>{fmt(r.con_new_amount)}</Td>
                            <Td>{r.con_renew_count}</Td>
                            <Td>{fmt(r.con_renew_amount)}</Td>
                            <Td>{r.biz_new_count}</Td>
                            <Td>{fmt(r.biz_new_amount)}</Td>
                            <Td>{r.biz_renew_count}</Td>
                            <Td>{fmt(r.biz_renew_amount)}</Td>
                            {FEATURES.DAILY_LOAN_ENABLED && (
                              <>
                                <Td>{r.daily_new_count}</Td>
                                <Td>{fmt(r.daily_new_amount)}</Td>
                                <Td>{r.daily_renew_count}</Td>
                                <Td>{fmt(r.daily_renew_amount)}</Td>
                              </>
                            )}
                            <Td className="font-semibold">{tc}</Td>
                            <Td className="font-semibold">{fmt(ta)}</Td>
                            <Td>{fmt(r.doc_fee)}</Td>
                            <Td>{fmt(r.ins_fee)}</Td>
                            <Td>{fmt(r.cash_amount)}</Td>
                            <Td>{fmt(r.dep_amount)}</Td>
                            <Td className="font-semibold">
                              {fmt(r.cash_amount + r.dep_amount)}
                            </Td>
                            <Td>
                              {Number(r.death_amount) > 0 ? (
                                <span className="text-red-600 font-medium">
                                  {fmt(r.death_amount)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </Td>
                          </tr>
                        );
                      })}

                      {/* Totals row */}
                      <tr className="bg-amber-50 font-bold border-t-2 border-amber-300">
                        <Td className="text-amber-700 font-bold" colSpan={3}>
                          Total
                        </Td>
                        <Td className="text-amber-800">{tableTotals.active}</Td>
                        <Td>{tableTotals.con_new_count}</Td>
                        <Td>{fmt(tableTotals.con_new_amount)}</Td>
                        <Td>{tableTotals.con_renew_count}</Td>
                        <Td>{fmt(tableTotals.con_renew_amount)}</Td>
                        <Td>{tableTotals.biz_new_count}</Td>
                        <Td>{fmt(tableTotals.biz_new_amount)}</Td>
                        <Td>{tableTotals.biz_renew_count}</Td>
                        <Td>{fmt(tableTotals.biz_renew_amount)}</Td>
                        {FEATURES.DAILY_LOAN_ENABLED && (
                          <>
                            <Td>{tableTotals.daily_new_count}</Td>
                            <Td>{fmt(tableTotals.daily_new_amount)}</Td>
                            <Td>{tableTotals.daily_renew_count}</Td>
                            <Td>{fmt(tableTotals.daily_renew_amount)}</Td>
                          </>
                        )}
                        <Td>
                          {tableTotals.con_new_count +
                            tableTotals.con_renew_count +
                            tableTotals.biz_new_count +
                            tableTotals.biz_renew_count +
                            (FEATURES.DAILY_LOAN_ENABLED
                              ? tableTotals.daily_new_count +
                                tableTotals.daily_renew_count
                              : 0)}
                        </Td>
                        <Td>
                          {fmt(
                            tableTotals.con_new_amount +
                              tableTotals.con_renew_amount +
                              tableTotals.biz_new_amount +
                              tableTotals.biz_renew_amount +
                              (FEATURES.DAILY_LOAN_ENABLED
                                ? tableTotals.daily_new_amount +
                                  tableTotals.daily_renew_amount
                                : 0),
                          )}
                        </Td>
                        <Td>{fmt(tableTotals.doc_fee)}</Td>
                        <Td>{fmt(tableTotals.ins_fee)}</Td>
                        <Td>{fmt(tableTotals.cash_amount)}</Td>
                        <Td>{fmt(tableTotals.dep_amount)}</Td>
                        <Td>
                          {fmt(
                            tableTotals.cash_amount + tableTotals.dep_amount,
                          )}
                        </Td>
                        <Td>
                          {tableTotals.death_amount > 0 ? (
                            <span className="text-red-600">
                              {fmt(tableTotals.death_amount)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Balance summary - Using backend-calculated values */}
              <div className="p-4 bg-amber-50 border-t border-amber-200 flex flex-col sm:flex-row gap-3 text-sm flex-wrap">
                <span className="font-semibold text-gray-700">
                  Cash Balance for {execName}:{" "}
                  <span className="text-primary">
                    Rs. {fmt(branchCashBalance)}.00
                  </span>
                </span>
                <span className="hidden sm:block text-gray-300">|</span>
                <span className="font-semibold text-gray-700">
                  Total Balance for {execName}:{" "}
                  <span className="text-primary">
                    Rs. {fmt(branchBalance)}.00
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses Table */}
        {!loading && expenses.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt size={18} className="text-primary" />
                  Expenses for {user?.name} — {date}
                </CardTitle>
                <Badge className="bg-red-100 text-red-700 border-0">
                  Total: Rs. {fmt(totalExpenses)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Fixed: Added horizontal scroll for expenses table too */}
              <div className="w-full overflow-x-auto">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        {[
                          "#",
                          "Category",
                          "Description",
                          "Added By",
                          "Amount (Rs.)",
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="text-xs font-semibold text-gray-600"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((e, i) => (
                        <TableRow
                          key={e.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <TableCell className="text-xs text-gray-400">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            {e.category}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {e.description || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {e.added_by}
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-gray-800 text-right">
                            Rs. {fmt(e.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Cash in hand summary - Using backend-calculated value */}
              <div className="p-4 bg-amber-50 border-t border-amber-200 flex flex-col sm:flex-row gap-3 text-sm flex-wrap">
                <span className="font-semibold text-gray-700">
                  Expenses for {user?.name}:{" "}
                  <span className="text-red-600">
                    Rs. {fmt(totalExpenses)}.00
                  </span>
                </span>
                <span className="hidden sm:block text-gray-300">|</span>
                <span className="font-semibold text-gray-700">
                  Cash In Hand for {user?.name}:{" "}
                  <span
                    className={
                      cashInHand < 0 ? "text-red-600" : "text-green-600"
                    }
                  >
                    Rs. {fmt(cashInHand)}.00
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && rows.length === 0 && bname && execName && (
          <div className="flex flex-col items-center gap-3 text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No data found</p>
            <p className="text-xs text-gray-400">
              No center activity for {bname} on {date}.
            </p>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Submit Day-End Report
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-gray-600">
            <p>
              Submit the day-end report for <strong>{bname}</strong> on{" "}
              <strong>{date}</strong>?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Cash Balance:</span>
                <span className="font-semibold">
                  Rs. {fmt(branchCashBalance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Expenses:</span>
                <span className="font-semibold text-red-600">
                  Rs. {fmt(totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-medium">Cash In Hand:</span>
                <span
                  className={`font-bold ${cashInHand < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  Rs. {fmt(cashInHand)}
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
              onClick={handleSubmit}
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
      {/* WhatsApp Preparing Dialog */}
      <Dialog open={waDialogOpen} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-xs"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              Preparing WhatsApp message…
            </p>
            <p className="text-xs text-gray-400">
              This will only take a moment
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {/* Copy Message Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Cash Message — {execName}
            </DialogTitle>
          </DialogHeader>

          {copyDialogLoading ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-500">Preparing message…</p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={16}
                className="w-full text-sm font-mono border border-gray-200 rounded-lg p-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              />
              <p className="text-xs text-gray-400">
                You can edit the message above before copying — this won't
                change any saved report data.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleResetMessage}
              disabled={copyDialogLoading || editedMessage === originalMessage}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              onClick={handleCopyToClipboard}
              disabled={copyDialogLoading}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DayEndReport;
