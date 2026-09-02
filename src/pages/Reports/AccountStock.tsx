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
  UserCircle,
  AlertCircle,
  CheckCircle2,
  Download,
  Filter,
  XCircle,
  TrendingDown,
  Hash,
  Clock,
} from "lucide-react";
import { API } from "@/apiConfig";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { getActiveUsers, User } from "@/lib/userHelpers";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";

const ALL = "__all__";
const RECORDS_PER_PAGE = 50;

interface AccountStockRecord {
  id: number;
  bname: string;
  bcode: string;
  center: string;
  ccode: string;
  group: string;
  cname: string;
  nic: string;
  address: string;
  phone1: string;
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
  document_fee: number;
  insurance_fee: number;
  interest_amount: number;
  to_pay: number;
  loan_category: string;
  status: "LAP" | "ACTIVE";
  executive_name: string;
  branch_day: string;
  last_payment_amount: number;
  last_payment_date: string;
  arrears: number;
}

interface AccountStockResponse {
  error: string;
  records: AccountStockRecord[];
  summary: {
    total_records: number;
    total_loan_amount: number;
    total_balance: number;
    total_arrears: number;
    total_to_pay: number;
  };
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    per_page: number;
  };
  filters: {
    loan_date: string;
    branch: string;
    user: string;
  };
}

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtNumber = (n: number) => Number(n).toLocaleString("en-LK");

const todayISO = () => new Date().toISOString().split("T")[0];

// Function to export ALL records (not just current page)
async function exportAllToExcel(
  loanDate: string,
  selectedBranch: string,
  selectedUser: string,
  user: any,
  isSpecialAdmin: boolean,
) {
  try {
    // Show loading indicator (you might want to add a toast or loading state)
    const params = new URLSearchParams({
      loan_date: loanDate,
      export_all: "true", // Add this parameter to indicate we want all records
      role: user?.status || "",
      userid: user?.id?.toString() || "",
      bname: user?.bname || "",
      is_special_admin: isSpecialAdmin ? "1" : "0",
    });

    if (selectedBranch && selectedBranch !== ALL) {
      params.set("branch", selectedBranch);
    }

    if (selectedUser) {
      params.set("user", selectedUser);
    }

    const res = await fetch(`${API.report.getAccountStock}?${params}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to fetch");

    const allRecords = data.records || [];

    if (allRecords.length === 0) {
      alert("No records to export");
      return;
    }

    // Now export using the same function but with all records
    exportToExcel(allRecords, {
      loanDate,
      branch: selectedBranch,
      user: selectedUser,
    });
  } catch (err: any) {
    console.error("Export error:", err);
    alert("Failed to export data: " + err.message);
  }
}

// Excel export function - with all columns
// function exportToExcel(records: AccountStockRecord[], filters: any) {
//   const headers = [
//     "ID",
//     "Branch",
//     "Branch Code",
//     "Center",
//     "Center Code",
//     "Group",
//     "Executive",
//     "Branch Day",
//     "Customer Name",
//     "NIC",
//     "Phone",
//     "Address",
//     "Customer Code",
//     "Loan Code",
//     "Loan Category",
//     "Type",
//     "Period",
//     "Interest %",
//     "Loan Date",
//     "Due Date",
//     "Loan Amount",
//     "Loan Balance",
//     "Status",
//     "Week Payment",
//     "Full Loan",
//     "Document Fee",
//     "Insurance Fee",
//     "Interest Amount",
//     "To Pay",
//     "Last Payment",
//     "Last Payment Date",
//     "Arrears",
//     "Payment",
//   ];

//   const esc = (v: string | number | null | undefined) => {
//     const s = String(v ?? "");
//     return s.includes(",") || s.includes('"') || s.includes("\n")
//       ? `"${s.replace(/"/g, '""')}"`
//       : s;
//   };

//   const rows = records.map((r) => [
//     r.id,
//     r.bname,
//     r.bcode,
//     r.center,
//     r.ccode,
//     r.group,
//     r.executive_name,
//     r.branch_day,
//     r.cname,
//     r.nic,
//     r.phone1,
//     r.address || "",
//     r.customer_code,
//     r.loan_code,
//     r.loan_category,
//     r.type,
//     r.period,
//     r.interest,
//     r.loan_date,
//     r.due_date,
//     Number(r.loan_amount || 0).toFixed(2),
//     Number(r.loan_balance || 0).toFixed(2),
//     r.status,
//     Number(r.week_payment || 0).toFixed(2),
//     Number(r.full_loan || 0).toFixed(2),
//     Number(r.document_fee || 0).toFixed(2),
//     Number(r.insurance_fee || 0).toFixed(2),
//     Number(r.interest_amount || 0).toFixed(2),
//     Number(r.to_pay || 0).toFixed(2),
//     Number(r.last_payment_amount || 0).toFixed(2),
//     r.last_payment_date || "",
//     Number(r.arrears || 0).toFixed(2),
//     Number(r.payment || 0).toFixed(2),
//   ]);

//   // Calculate totals safely with Number conversion
//   const totalLoanAmount = records.reduce(
//     (s, r) => s + Number(r.loan_amount || 0),
//     0,
//   );
//   const totalLoanBalance = records.reduce(
//     (s, r) => s + Number(r.loan_balance || 0),
//     0,
//   );
//   const totalWeekPayment = records.reduce(
//     (s, r) => s + Number(r.week_payment || 0),
//     0,
//   );
//   const totalFullLoan = records.reduce(
//     (s, r) => s + Number(r.full_loan || 0),
//     0,
//   );
//   const totalDocumentFee = records.reduce(
//     (s, r) => s + Number(r.document_fee || 0),
//     0,
//   );
//   const totalInsuranceFee = records.reduce(
//     (s, r) => s + Number(r.insurance_fee || 0),
//     0,
//   );
//   const totalInterestAmount = records.reduce(
//     (s, r) => s + Number(r.interest_amount || 0),
//     0,
//   );
//   const totalToPay = records.reduce((s, r) => s + Number(r.to_pay || 0), 0);
//   const totalLastPayment = records.reduce(
//     (s, r) => s + Number(r.last_payment_amount || 0),
//     0,
//   );
//   const totalArrears = records.reduce((s, r) => s + Number(r.arrears || 0), 0);
//   const totalPayment = records.reduce((s, r) => s + Number(r.payment || 0), 0);

//   const totalRow = [
//     "TOTALS",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     "",
//     totalLoanAmount.toFixed(2),
//     totalLoanBalance.toFixed(2),
//     "",
//     totalWeekPayment.toFixed(2),
//     totalFullLoan.toFixed(2),
//     totalDocumentFee.toFixed(2),
//     totalInsuranceFee.toFixed(2),
//     totalInterestAmount.toFixed(2),
//     totalToPay.toFixed(2),
//     totalLastPayment.toFixed(2),
//     "",
//     totalArrears.toFixed(2),
//     totalPayment.toFixed(2),
//   ];

//   const csv =
//     "\uFEFF" +
//     [headers, ...rows, totalRow]
//       .map((row) => row.map(esc).join(","))
//       .join("\n");

//   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `Account_Stock_${filters.loanDate}_${filters.branch || "All"}_Full.csv`;
//   a.click();
//   URL.revokeObjectURL(url);
// }
function exportToExcel(records: AccountStockRecord[], filters: any) {
  // ✅ Removed: ID, Branch Code, Group, Document Fee, Insurance Fee, Interest Amount, To Pay
  const headers = [
    "Branch",
    "Center",
    "Center Code",
    "Executive",
    "Branch Day",
    "Customer Name",
    "NIC",
    "Phone",
    "Address",
    "Customer Code",
    "Loan Code",
    "Loan Category",
    "Type",
    "Period",
    "Interest %",
    "Loan Date",
    "Due Date",
    "Loan Amount",
    "Loan Balance",
    "Status",
    "Week Payment",
    "Full Loan",
    "Last Payment",
    "Last Payment Date",
    "Arrears",
    "Payment",
  ];

  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = records.map((r) => [
    r.bname,
    r.center,
    r.ccode,
    r.executive_name,
    r.branch_day,
    r.cname,
    r.nic,
    r.phone1,
    r.address || "",
    r.customer_code,
    r.loan_code,
    r.loan_category,
    r.type,
    r.period,
    r.interest,
    r.loan_date,
    r.due_date,
    Number(r.loan_amount || 0).toFixed(2),
    Number(r.loan_balance || 0).toFixed(2),
    r.status,
    Number(r.week_payment || 0).toFixed(2),
    Number(r.full_loan || 0).toFixed(2),
    Number(r.last_payment_amount || 0).toFixed(2),
    r.last_payment_date || "",
    Number(r.arrears || 0).toFixed(2),
    Number(r.payment || 0).toFixed(2),
  ]);

  const totalLoanAmount = records.reduce(
    (s, r) => s + Number(r.loan_amount || 0),
    0,
  );
  const totalLoanBalance = records.reduce(
    (s, r) => s + Number(r.loan_balance || 0),
    0,
  );
  const totalWeekPayment = records.reduce(
    (s, r) => s + Number(r.week_payment || 0),
    0,
  );
  const totalFullLoan = records.reduce(
    (s, r) => s + Number(r.full_loan || 0),
    0,
  );
  const totalLastPayment = records.reduce(
    (s, r) => s + Number(r.last_payment_amount || 0),
    0,
  );
  const totalArrears = records.reduce((s, r) => s + Number(r.arrears || 0), 0);
  const totalPayment = records.reduce((s, r) => s + Number(r.payment || 0), 0);

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
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalLoanAmount.toFixed(2),
    totalLoanBalance.toFixed(2),
    "",
    totalWeekPayment.toFixed(2),
    totalFullLoan.toFixed(2),
    totalLastPayment.toFixed(2),
    "",
    totalArrears.toFixed(2),
    totalPayment.toFixed(2),
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
  a.download = `Account_Stock_${filters.loanDate}_${filters.branch || "All"}_Full.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
const AccountStock = () => {
  const { user } = useAuth();

  // Special admin users who get full access
  const SPECIAL_ADMIN_USERS = ["DINESH BANDARA KU"];
  const isSpecialAdmin = user?.name
    ? SPECIAL_ADMIN_USERS.includes(user.name)
    : false;

  const isAdmin = user?.status === "admin" || isSpecialAdmin;
  const isBranchManager = user?.status === "branch_manager";
  const isManager = user?.status === "manager";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isKegalleUser = user?.bname === "KEGALLE";

  // Filter state
  const [loanDate, setLoanDate] = useState(todayISO());
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Data state
  const [records, setRecords] = useState<AccountStockRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dropdown options
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  // Check if user has access
  const isExecutive = user?.status === "executive";
  const [stockStats, setStockStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // Check if user has access
  const hasAccess =
    isAdmin ||
    isBranchManager ||
    isManager ||
    isRegional ||
    isExecutive ||
    isSpecialAdmin;

  // Load branches based on user role
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
            { label: "All Branches", value: ALL },
            { label: "KEGALLE", value: "KEGALLE", sub: "G01" },
            { label: "NARAMMALA", value: "NARAMMALA", sub: "G04" },
            { label: "KEGALLE + NARAMMALA", value: "KEGALLE+NARAMMALA" },
          ];
        } else if (isKegalleUser && isExecutive) {
          // KEGALLE executives also get the KEGALLE/NARAMMALA picker
          options = [
            { label: "All Branches", value: ALL },
            { label: "KEGALLE", value: "KEGALLE", sub: "G01" },
            { label: "NARAMMALA", value: "NARAMMALA", sub: "G04" },
            { label: "KEGALLE + NARAMMALA", value: "KEGALLE+NARAMMALA" },
          ];
          setSelectedBranch("KEGALLE+NARAMMALA");
        } else if (isBranchManager || isManager) {
          options = [
            {
              label: user.bname || "",
              value: user.bname || "",
              sub: branchesData.find((b: Branch) => b.bname === user.bname)
                ?.bcode,
            },
          ];
          setSelectedBranch(user.bname || "");
        } else if (isExecutive) {
          // Non-KEGALLE executives locked to their own branch
          options = [
            {
              label: user.bname || "",
              value: user.bname || "",
              sub: branchesData.find((b: Branch) => b.bname === user.bname)
                ?.bcode,
            },
          ];
          setSelectedBranch(user.bname || "");
        }
        setBranchOptions(options);
      } catch (error) {
        console.error("Error loading branches:", error);
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
    isExecutive,
    isKegalleUser,
  ]);

  // Load users based on role and selected branch
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) return;
      setLoadingUsers(true);
      try {
        // Executives: just their own name, no need to fetch/filter the full user list
        if (isExecutive) {
          setUserOptions([{ label: user.name, value: user.name }]);
          setSelectedUser(user.name);
          return;
        }

        const usersData = await getActiveUsers();

        let filteredUsers = usersData;

        if (!isAdmin && !isSpecialAdmin) {
          if (isBranchManager || isManager) {
            if (isKegalleUser) {
              filteredUsers = usersData.filter(
                (u) => u.bname === "KEGALLE" || u.bname === "NARAMMALA",
              );
            } else {
              filteredUsers = usersData.filter((u) => u.bname === user.bname);
            }
          } else if (isRegional) {
            filteredUsers = usersData.filter(
              (u) =>
                u.bname === user.bname ||
                u.bname === "KEGALLE" ||
                u.bname === "NARAMMALA",
            );
          }
        }

        if (selectedBranch && selectedBranch !== ALL) {
          if (selectedBranch === "KEGALLE+NARAMMALA") {
            filteredUsers = filteredUsers.filter(
              (u) => u.bname === "KEGALLE" || u.bname === "NARAMMALA",
            );
          } else {
            filteredUsers = filteredUsers.filter(
              (u) => u.bname === selectedBranch,
            );
          }
        }

        const uniqueUsers = Array.from(
          new Map(filteredUsers.map((u) => [u.name, u])).values(),
        );

        const options: SelectOption[] = [
          { label: "All Users", value: "" },
          ...uniqueUsers
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((u) => ({
              label: u.name,
              value: u.name,
              sub: u.bname,
            })),
        ];

        setUserOptions(options);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [
    user,
    selectedBranch,
    isAdmin,
    isSpecialAdmin,
    isBranchManager,
    isManager,
    isRegional,
    isExecutive,
    isKegalleUser,
  ]);
  const fetchStockStats = useCallback(async () => {
    if (!loanDate) return;
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({
        loan_date: loanDate,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        bname: user?.bname || "",
        is_special_admin: isSpecialAdmin ? "1" : "0",
      });
      if (selectedBranch && selectedBranch !== ALL)
        params.set("branch", selectedBranch);
      if (selectedUser) params.set("user", selectedUser);

      const res = await fetch(
        `${API.report.getAccountStock.replace("get_account_stock", "stock_stats")}?${params}`,
      );
      const data = await res.json();
      if (res.ok) setStockStats(data.stats || null);
    } catch (err) {
      console.error("stock_stats fetch error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [loanDate, selectedBranch, selectedUser, user, isSpecialAdmin]);
  // Fetch report
  const fetchReport = useCallback(
    async (page = 1) => {
      if (!loanDate) {
        setError("Please select a loan date");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          loan_date: loanDate,
          page: page.toString(),
          per_page: RECORDS_PER_PAGE.toString(),
          role: user?.status || "",
          userid: user?.id?.toString() || "",
          bname: user?.bname || "",
          is_special_admin: isSpecialAdmin ? "1" : "0",
        });

        if (selectedBranch && selectedBranch !== ALL) {
          params.set("branch", selectedBranch);
        }

        if (selectedUser) {
          params.set("user", selectedUser);
        }

        const res = await fetch(`${API.report.getAccountStock}?${params}`);
        const data: AccountStockResponse = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch");

        setRecords(data.records || []);
        setSummary(data.summary || null);
        setPagination(data.pagination || null);
        setCurrentPage(data.pagination?.current_page || 1);
        setHasSearched(true);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    },
    [loanDate, selectedBranch, selectedUser, user, isSpecialAdmin],
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.total_pages || 1)) {
      fetchReport(page);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReport(1);
    fetchStockStats();
  };

  // Handle export all
  const handleExportAll = async () => {
    setExporting(true);
    try {
      await exportAllToExcel(
        loanDate,
        selectedBranch,
        selectedUser,
        user,
        isSpecialAdmin,
      );
    } finally {
      setExporting(false);
    }
  };

  // Calculate totals for current page
  const pageTotals = {
    loan_amount: records.reduce((sum, r) => sum + r.loan_amount, 0),
    loan_balance: records.reduce((sum, r) => sum + r.loan_balance, 0),
    arrears: records.reduce((sum, r) => sum + r.arrears, 0),
    to_pay: records.reduce((sum, r) => sum + r.to_pay, 0),
    payment: records.reduce((sum, r) => sum + r.payment, 0),
  };
  useEffect(() => {
    if (!user?.id || !hasAccess) return;
    setLoadingReports(true);
    fetch(
      `${API.report.getAccountStock.replace("get_account_stock", "stock-reports")}?userid=${user.id}&role=${user.status || ""}`,
    )
      .then((r) => r.json())
      .then((d) => setRecentReports(d.files || []))
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }, [user, hasAccess]);

  // ── Add this helper ──
  const getSaturdayGroups = (files: any[]) => {
    const groups: Record<string, any[]> = {};
    files.forEach((f) => {
      // Find the most recent Saturday on or before this file's date
      const d = new Date(f.date);
      const day = d.getDay(); // 0=Sun, 6=Sat
      const daysToSat = day === 6 ? 0 : day === 0 ? 1 : day + 1;
      const sat = new Date(d);
      sat.setDate(d.getDate() - (day === 6 ? 0 : day === 0 ? 1 : 6 - day + 1));
      const satKey = sat.toISOString().slice(0, 10);
      if (!groups[satKey]) groups[satKey] = [];
      groups[satKey].push(f);
    });
    return groups;
  };

  const fmtFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6  mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Account Stock Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View customer loan balances and account stock details
            </p>
          </div>
          {summary && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                Loans up to: {loanDate}
              </span>
            </div>
          )}
        </div>

        {/* Access Denied */}
        {!hasAccess && (
          <Card className="border-0 shadow-lg  mx-auto">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Access Denied
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  You do not have permission to access this report. Please
                  contact your administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Card */}
        {hasAccess && (
          <Card className="mb-6 border-0 shadow-lg  mx-auto">
            <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800">
                    Filter Account Stock
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select loan date, branch and user to view account stock
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Loan Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Loan Date (up to)
                    </Label>
                    <Input
                      type="date"
                      value={loanDate}
                      onChange={(e) => setLoanDate(e.target.value)}
                      className="h-11 bg-white border-gray-200"
                      required
                    />
                  </div>

                  {/* Branch */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Branch
                    </Label>
                    <SearchableSelect
                      options={branchOptions}
                      value={selectedBranch}
                      onChange={setSelectedBranch}
                      placeholder={
                        loadingBranches ? "Loading branches..." : "All Branches"
                      }
                      disabled={
                        loadingBranches ||
                        (isBranchManager && !isKegalleUser && !isAdmin)
                      }
                    />
                  </div>

                  {/* User */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <UserCircle className="w-3.5 h-3.5" /> Executive
                    </Label>
                    <SearchableSelect
                      options={userOptions}
                      value={selectedUser}
                      onChange={setSelectedUser}
                      placeholder={
                        loadingUsers ? "Loading users..." : "All Users"
                      }
                      disabled={loadingUsers || isExecutive}
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 opacity-0">
                      Generate
                    </Label>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </form>

              {/* Messages */}
              {success && (
                <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium">
                    Report generated successfully!
                  </span>
                </div>
              )}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {hasAccess && !loading && hasSearched && (
          <div className="space-y-4 mx-auto">
            {/* Stock Stats Grid */}
            {(summary || stockStats) && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent border-b border-gray-100 py-3 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                    <TrendingDown className="w-4 h-4 text-indigo-600" />
                    Portfolio Summary
                    {statsLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-gray-400 ml-1" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {/* Column headers — hidden on mobile */}
                  <div className="hidden sm:grid sm:grid-cols-7 gap-3 mb-2 px-2">
                    {[
                      "",
                      "Total Loans",
                      "Total Stock",
                      "With Arrears",
                      "Total Arrears",
                      "Without Arrears",
                      "Stock Without Arrears",
                    ].map((h) => (
                      <p
                        key={h}
                        className="text-xs font-semibold text-gray-400 text-right first:text-left"
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
                      const row = stockStats?.[key];
                      if (!row || row.total_loans === 0) return null;
                      return (
                        <div
                          key={key}
                          className={`${bg} rounded-xl px-4 py-3 border-l-4 ${accent}`}
                        >
                          {/* Mobile layout */}
                          <div className="sm:hidden">
                            <p
                              className={`text-xs font-bold ${labelColor} mb-2`}
                            >
                              {label}
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Total Loans
                                </p>
                                <p className="text-xs font-semibold text-gray-700">
                                  {fmtNumber(row.total_loans)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Total Stock
                                </p>
                                <p className="text-xs font-semibold text-amber-700">
                                  {fmt(row.total_stock)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Loans With Arrears
                                </p>
                                <p className="text-xs font-semibold text-red-600">
                                  {fmtNumber(row.with_arrears_count)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Total Arrears
                                </p>
                                <p className="text-xs font-bold text-red-600">
                                  {fmt(row.total_arrears)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Loans Without Arrears
                                </p>
                                <p className="text-xs font-semibold text-green-600">
                                  {fmtNumber(row.without_arrears_count)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">
                                  Without Arrears
                                </p>
                                <p className="text-xs font-medium text-green-700">
                                  {fmt(row.stock_without_arrears)}
                                </p>
                              </div>
                            </div>
                          </div>
                          {/* Desktop layout */}
                          <div className="hidden sm:grid sm:grid-cols-7 gap-3 items-center">
                            <p className={`text-xs font-bold ${labelColor}`}>
                              {label}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 text-right">
                              {fmtNumber(row.total_loans)}
                            </p>
                            <p className="text-xs font-semibold text-amber-700 text-right">
                              {fmt(row.total_stock)}
                            </p>
                            <p className="text-xs font-semibold text-red-600 text-right">
                              {fmtNumber(row.with_arrears_count)}
                            </p>
                            <p className="text-xs font-bold text-red-600 text-right">
                              {fmt(row.total_arrears)}
                            </p>

                            <p className="text-xs font-semibold text-green-600 text-right">
                              {fmtNumber(row.without_arrears_count)}
                            </p>
                            <p className="text-xs font-medium text-green-700 text-right">
                              {fmt(row.stock_without_arrears)}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Totals row */}
                    {stockStats?.totals && (
                      <div className="bg-yellow-500 rounded-xl px-4 py-3 mt-1">
                        {/* Mobile */}
                        <div className="sm:hidden">
                          <p className="text-sm font-bold text-black mb-2">
                            Totals
                            {summary && (
                              <span className="ml-2 font-bold text-sm">
                                — {fmtNumber(summary.total_records)} loans
                              </span>
                            )}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                              <p className="text-[12px] text-black/60">
                                Total Loans
                              </p>
                              <p className="text-sm font-bold text-black">
                                {fmtNumber(stockStats.totals.total_loans)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[12px] text-black/60">
                                Total Stock
                              </p>
                              <p className="text-sm font-bold text-black">
                                {fmt(stockStats.totals.total_stock)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[12px] text-black/60">
                                Loans With Arrears
                              </p>
                              <p className="text-sm font-bold text-black">
                                {fmtNumber(
                                  stockStats.totals.with_arrears_count,
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[12px] text-black/60">
                                Total Arrears
                              </p>
                              <p className="text-sm font-bold text-black">
                                {fmt(stockStats.totals.total_arrears)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[12px] text-black/60">
                                Loans Without Arrears
                              </p>
                              <p className="text-sm font-bold text-black">
                                {fmtNumber(
                                  stockStats.totals.without_arrears_count,
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[12px] text-black/60">
                                Without Arrears
                              </p>
                              <p className="text-sm font-bold text-black">
                                {fmt(stockStats.totals.stock_without_arrears)}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-7 gap-3 items-center">
                          <p className="text-[14px] font-bold text-black">
                            Totals
                            {summary && (
                              <span className="block font-bold text-[14px] mt-0.5">
                                {fmtNumber(summary.total_records)} loans
                              </span>
                            )}
                          </p>
                          <p className="text-[14px] font-bold text-black text-right">
                            {fmtNumber(stockStats.totals.total_loans)}
                          </p>
                          <p className="text-[14px] font-bold text-black text-right">
                            {fmt(stockStats.totals.total_stock)}
                          </p>
                          <p className="text-[14px] font-bold text-black text-right">
                            {fmtNumber(stockStats.totals.with_arrears_count)}
                          </p>
                          <p className="text-[14px] font-bold text-black text-right">
                            {fmt(stockStats.totals.total_arrears)}
                          </p>

                          <p className="text-[14px] font-bold text-black text-right">
                            {fmtNumber(stockStats.totals.without_arrears_count)}
                          </p>
                          <p className="text-[14px] font-bold text-black text-right">
                            {fmt(stockStats.totals.stock_without_arrears)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pagination Info & Download Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {pagination && (
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Showing {records.length} of{" "}
                    {fmtNumber(pagination.total_records)} total records | Page{" "}
                    {pagination.current_page} of {pagination.total_pages}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                {records.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 shrink-0"
                    onClick={() =>
                      exportToExcel(records, {
                        loanDate,
                        branch: selectedBranch,
                        user: selectedUser,
                      })
                    }
                  >
                    <Download className="w-4 h-4" />
                    Download Current Page
                  </Button>
                )}
                {summary && summary.total_records > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-green-300 text-green-700 hover:bg-green-50 shrink-0"
                    onClick={handleExportAll}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download All Records
                  </Button>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  « First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </Button>
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium">
                  Page {currentPage} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.total_pages}
                >
                  Next ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.total_pages)}
                  disabled={currentPage === pagination.total_pages}
                >
                  Last »
                </Button>
              </div>
            )}

            {/* Table */}
            {records.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">
                      No records found
                    </p>
                    <p className="text-sm text-gray-400">
                      No account stock records found for the selected filters.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent border-b border-gray-100 py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Account Stock Details
                    </CardTitle>
                    <Badge className="bg-indigo-100 text-indigo-700 border-0">
                      Page {currentPage} • {records.length} records
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[2200px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="text-xs font-semibold text-gray-600">
                              ID
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Branch
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Center
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Executive
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Customer
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              NIC
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Phone
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Address
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Loan Code
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Category
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Type
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Period
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Interest %
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Loan Date
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Due Date
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Loan Amount
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Balance
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Week Payment
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Payment
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Last Payment
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Payment Date
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Arrears
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((row) => (
                            <TableRow key={row.id} className="hover:bg-gray-50">
                              <TableCell className="text-xs font-mono text-gray-500">
                                {row.id}
                              </TableCell>
                              <TableCell className="text-xs text-gray-700">
                                {row.bname}
                              </TableCell>
                              <TableCell className="text-xs text-gray-700">
                                {row.center}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.executive_name}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-gray-800">
                                {row.cname}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-gray-600">
                                {row.nic}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.phone1}
                              </TableCell>
                              <TableCell
                                className="text-xs text-gray-600 max-w-[200px] truncate"
                                title={row.address}
                              >
                                {row.address || "—"}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-gray-500">
                                {row.loan_code}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge
                                  className={
                                    row.loan_category === "Daily Loan"
                                      ? "bg-purple-100 text-purple-700"
                                      : row.loan_category === "Business Loan"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                  }
                                >
                                  {row.loan_category === "Daily Loan"
                                    ? "Daily"
                                    : row.loan_category === "Business Loan"
                                      ? "Biz"
                                      : "Con"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.type}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.period}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.interest}%
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {row.loan_date}
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {row.due_date}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-gray-800">
                                {fmt(row.loan_amount)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-amber-600">
                                {fmt(row.loan_balance)}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge
                                  className={
                                    row.status === "LAP"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-green-100 text-green-700"
                                  }
                                >
                                  {row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right text-gray-600">
                                {fmt(row.week_payment)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-blue-600">
                                {fmt(row.payment)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-green-600">
                                {fmt(row.last_payment_amount)}
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {row.last_payment_date || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold text-red-600">
                                {fmt(row.arrears)}
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Page Totals Row */}
                          <TableRow className="bg-indigo-50 font-bold border-t-2 border-indigo-200">
                            <TableCell
                              colSpan={15}
                              className="text-xs font-bold text-gray-700"
                            >
                              Page Totals ({records.length} records)
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-gray-800">
                              {fmt(pageTotals.loan_amount)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-amber-700">
                              {fmt(pageTotals.loan_balance)}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-xs text-right font-bold text-gray-800">
                              {fmt(pageTotals.payment)}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                            <TableCell className="text-xs text-right font-bold text-red-700">
                              {fmt(pageTotals.arrears)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bottom Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  « First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </Button>
                <span className="px-4 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium">
                  Page {currentPage} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.total_pages}
                >
                  Next ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.total_pages)}
                  disabled={currentPage === pagination.total_pages}
                >
                  Last »
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Initial state + Recent Reports */}
        {hasAccess && !loading && !hasSearched && (
          <div className=" mx-auto space-y-6">
            {/* Generate prompt */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">
                    Select filters and generate report
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Choose a loan date, branch and user to view account stock
                    details.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-800">
                      Recent Reports
                    </h2>
                    <p className="text-xs text-gray-500">
                      Grouped by weekly Saturday cutoff
                    </p>
                  </div>
                </div>
                {loadingReports && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {!loadingReports && recentReports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                  <Hash className="w-8 h-8" />
                  <p className="text-sm">No saved reports found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(getSaturdayGroups(recentReports))
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 8) // show last 8 Saturdays
                    .map(([satDate, files]) => (
                      <div key={satDate}>
                        {/* Saturday date divider — Google Drive style */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            <span className="text-xs font-semibold text-indigo-700">
                              Week of{" "}
                              {new Date(satDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-xs text-gray-400">
                            {files.length} file{files.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Files grid — Drive-style cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {files.map((f) => (
                            <a
                              key={f.filename}
                              href={`${API.report.getAccountStock.replace("get_account_stock", "stock-reports/download")}?file=${encodeURIComponent(f.filename)}`}
                              download
                              className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer no-underline"
                            >
                              {/* File icon */}
                              <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                                <FileText className="w-5 h-5 text-green-600" />
                              </div>

                              {/* File info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-xs font-semibold text-gray-800 truncate"
                                  title={f.filename}
                                >
                                  {f.filename
                                    .replace(/Account_Stock_/g, "")
                                    .replace(/_Full\.csv$/, "")
                                    .replace(/_/g, " ")}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-400">
                                    {f.date}
                                  </span>
                                  <span className="text-[10px] text-gray-300">
                                    ·
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {fmtFileSize(f.size)}
                                  </span>
                                </div>
                              </div>

                              {/* Download icon */}
                              <Download className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountStock;
