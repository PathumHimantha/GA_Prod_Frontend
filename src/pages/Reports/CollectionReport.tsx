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
} from "lucide-react";
import { API } from "@/apiConfig";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { getActiveUsers, User } from "@/lib/userHelpers";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";

const ALL = "__all__";

interface CollectionRecord {
  customer_code: string;
  name: string;
  cname: string;
  center: string;
  ccode: string;
  branch: string;
  payment_date: string;
  payment: number;
  loan_amount: number;
}

interface CollectionResponse {
  records: CollectionRecord[];
  summary: {
    total_payment: number;
    total_loan: number;
    record_count: number;
  };
  date_from: string;
  date_to: string;
}

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const todayISO = () => new Date().toISOString().split("T")[0];

// Excel export function
function exportToExcel(
  records: CollectionRecord[],
  dateFrom: string,
  dateTo: string,
) {
  const headers = [
    "Customer Code",
    "Executive Name",
    "Customer Name",
    "Center",
    "Center Code",
    "Branch",
    "Payment Date",
    "Payment Amount",
    "Loan Amount",
  ];

  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = records.map((r) => [
    r.customer_code,
    r.name,
    r.cname,
    r.center,
    r.ccode,
    r.branch,
    r.payment_date,
    Number(r.payment).toFixed(2), // ← Number()
    Number(r.loan_amount).toFixed(2), // ← Number()
  ]);

  const totalPayment = records.reduce((sum, r) => sum + Number(r.payment), 0);
  const totalLoan = records.reduce((sum, r) => sum + Number(r.loan_amount), 0);

  const totalRow = [
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    totalPayment.toFixed(2),
    totalLoan.toFixed(2),
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
  a.download = `Collection_Report_${dateFrom}_to_${dateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CollectionReport = () => {
  const { user } = useAuth();

  // Special admin users who get full access
  const SPECIAL_ADMIN_USERS = ["PAWAN THILAKARATHNA", "DINESH BANDARA"];
  const isSpecialAdmin = user?.name
    ? SPECIAL_ADMIN_USERS.includes(user.name)
    : false;

  const isAdmin = user?.status === "admin" || isSpecialAdmin;
  const isBranchManager = user?.status === "branch_manager";
  const isManager = user?.status === "manager";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isExecutive = user?.status === "executive";
  const isKegalleUser = user?.bname === "KEGALLE";

  // Filter state
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");

  // Data state
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [summary, setSummary] = useState<{
    date_to: ReactNode;
    date_from: ReactNode;
    total_payment: number;
    total_loan: number;
    record_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Dropdown options
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
          // Admin sees all branches
          options = [
            { label: "All Branches", value: ALL },
            ...branchesData.map((b: Branch) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ];
        } else if (isRegional) {
          // Regional managers see assigned branches
          options = [
            { label: "All Branches", value: ALL },
            ...branchesData.map((b: Branch) => ({
              label: b.bname,
              value: b.bname,
              sub: b.bcode,
            })),
          ];
        } else if (isKegalleUser && (isBranchManager || isManager)) {
          // KEGALLE branch managers see KEGALLE, NARAMMALA, and combined option
          options = [
            { label: "KEGALLE", value: "KEGALLE", sub: "G01" },
            { label: "NARAMMALA", value: "NARAMMALA", sub: "G04" },
            { label: "KEGALLE + NARAMMALA", value: "KEGALLE+NARAMMALA" },
          ];
        } else if (isBranchManager || isManager) {
          // Other branch managers see only their branch
          options = [
            {
              label: user.bname || "",
              value: user.bname || "",
              sub: branchesData.find((b: Branch) => b.bname === user.bname)
                ?.bcode,
            },
          ];
        }

        setBranchOptions(options);
      } catch (error) {
        console.error("Error loading branches:", error);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [user, isAdmin, isRegional, isBranchManager, isManager, isKegalleUser]);

  // Load users based on role and selected branch
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) return;
      setLoadingUsers(true);
      try {
        const usersData = await getActiveUsers();

        let filteredUsers = usersData;

        // Apply role-based filtering
        if (!isAdmin && !isSpecialAdmin) {
          if (isBranchManager || isManager) {
            // Branch managers see users from their branch
            filteredUsers = usersData.filter((u) => u.bname === user.bname);
          } else if (isRegional) {
            // Regional managers see users from their assigned branches
            // This would need additional logic based on your regional_manager_branches table
            filteredUsers = usersData.filter(
              (u) =>
                u.bname === user.bname ||
                u.bname === "KEGALLE" ||
                u.bname === "NARAMMALA",
            );
          } else if (isExecutive) {
            // Executives only see themselves
            filteredUsers = usersData.filter((u) => u.name === user.name);
          }
        }

        // Apply branch filter if selected
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

        // Get unique usernames
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
  ]);

  // Fetch report
  const fetchReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        bname: user?.bname || "",
        is_special_admin: isSpecialAdmin ? "1" : "0",
      });

      if (selectedBranch && selectedBranch !== ALL) {
        params.set("selected_branch", selectedBranch);
      }

      if (selectedUser) {
        params.set("selected_name", selectedUser);
      }

      const res = await fetch(`${API.report.getCollectionReport}?${params}`);
      const data: CollectionResponse = await res.json();

      //   if (!res.ok) throw new Error(data.error || "Failed to fetch");

      setRecords(data.records || []);
      setSummary(data.summary || null);
      setHasSearched(true);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedBranch, selectedUser, user, isSpecialAdmin]);

  // Handle date validation
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateFrom(newDate);
    if (dateTo < newDate) {
      setDateTo(newDate);
    }
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate < dateFrom) {
      setError("Date To must be greater than or equal to Date From");
      setTimeout(() => setError(""), 4000);
    } else {
      setDateTo(newDate);
    }
  };

  // Calculate totals
  const totalPayment = records.reduce((sum, r) => sum + Number(r.payment), 0);
  const totalLoan = records.reduce((sum, r) => sum + Number(r.loan_amount), 0);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Collection Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View payment collections by date range, branch, and user
            </p>
          </div>
          {summary && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                {summary.date_from} → {summary.date_to}
              </span>
            </div>
          )}
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
                  Filter Collection Report
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select date range, branch and user to view collections
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date From
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  className="h-11 bg-white border-gray-200"
                  required
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date To
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={handleDateToChange}
                  min={dateFrom}
                  className="h-11 bg-white border-gray-200"
                  required
                />
              </div>

              {/* Branch */}
              {(isAdmin || isRegional || isBranchManager || isManager) && (
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
                    disabled={loadingBranches}
                  />
                </div>
              )}

              {/* User */}
              {(isAdmin || isRegional || isBranchManager || isManager) && (
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
                    disabled={loadingUsers}
                  />
                </div>
              )}

              {/* For executives, show read-only info */}
              {isExecutive && !isAdmin && !isSpecialAdmin && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Branch
                    </Label>
                    <div className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user?.bname}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Executive
                    </Label>
                    <div className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user?.name}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Generate Button */}
              <div className="space-y-2 lg:col-start-4">
                <Label className="text-sm font-medium text-gray-700 opacity-0">
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
                    <FileText className="w-4 h-4" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>

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
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {!loading && hasSearched && (
          <div className="space-y-4 mx-auto">
            {/* Summary + Download */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {summary && (
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500 leading-none">
                        Records
                      </p>
                      <p className="text-sm font-bold text-blue-700 mt-0.5">
                        {summary.record_count}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50">
                    <Download className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500 leading-none">
                        Total Payment
                      </p>
                      <p className="text-sm font-bold text-green-700 mt-0.5">
                        {fmt(summary.total_payment)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs text-gray-500 leading-none">
                        Total Loan
                      </p>
                      <p className="text-sm font-bold text-amber-700 mt-0.5">
                        {fmt(summary.total_loan)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {records.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50 shrink-0"
                  onClick={() => exportToExcel(records, dateFrom, dateTo)}
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
              )}
            </div>

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
                      No collection records found for the selected filters.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                      <FileText className="w-4 h-4 text-primary" />
                      Collection Details
                    </CardTitle>
                    <Badge className="bg-primary/10 text-primary border-0">
                      {records.length} records
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[1200px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Customer Code
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Executive Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Customer Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Center
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Center Code
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Branch
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600">
                              Payment Date
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Payment Amount
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 text-right">
                              Loan Amount
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((row, idx) => (
                            <TableRow
                              key={`${row.customer_code}-${row.payment_date}-${idx}`}
                              className="hover:bg-gray-50"
                            >
                              <TableCell className="text-xs font-mono text-gray-700">
                                {row.customer_code}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.name}
                              </TableCell>
                              <TableCell className="text-xs font-medium text-gray-800">
                                {row.cname}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.center}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-gray-500">
                                {row.ccode}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {row.branch}
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {row.payment_date}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium text-green-600">
                                {fmt(row.payment)}
                              </TableCell>
                              <TableCell className="text-xs text-right text-gray-700">
                                {fmt(row.loan_amount)}
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Totals row */}
                          <TableRow className="bg-amber-50 font-bold border-t-2 border-amber-200">
                            <TableCell
                              colSpan={7}
                              className="text-xs font-bold text-gray-700"
                            >
                              TOTALS ({records.length} records)
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-green-700">
                              {fmt(totalPayment)}
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-amber-700">
                              {fmt(totalLoan)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Initial state */}
        {!loading && !hasSearched && (
          <Card className="border-0 shadow-lg mx-auto">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Select filters and generate report
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Choose a date range, branch and user to view collection
                  records.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CollectionReport;
