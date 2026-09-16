// ProductPurchases.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Package,
  Eye,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { getActiveUsers, User } from "@/lib/userHelpers";

interface ProductLoan {
  loan_code: string;
  customer_code: string;
  customer_nic: string;
  customer_name: string;
  total_amount: number;
  loan_balance: number;
  week_payment: number;
  due_amount: number;
  document_fee: number;
  courier_charge: number;
  payment: number;
  loan_date: string;
  loan_due_date: string;
  center: string;
  ccode: string;
  bname: string;
  created_by: string;
  pending_due_amount: number;
  pending_dues_count: number;
}

interface ProductPayment {
  loan_code: string;
  payment: number;
  payment_method: string;
  payment_date: string;
}

interface ProductDayEndRow {
  ccode: string;
  center: string;
  active: number;
  total_loan_amount: number;
  total_balance: number;
  total_week_payment: number;
  document_fee: number;
  courier_charge: number;
  payment: number;
  cash_payment: number;
  cdk_payment: number;
  online_payment: number;
  bank_deposit: number;
  deposit_payment: number;
  pending_due_amount: number;
  pending_dues_count: number;
  loan_count: number;
  payment_count: number;
  loans: ProductLoan[];
  payments: ProductPayment[];
}

interface ProductDayEndResponse {
  success: boolean;
  data: {
    rows: ProductDayEndRow[];
    totals: {
      active: number;
      total_loan_amount: number;
      total_balance: number;
      total_week_payment: number;
      document_fee: number;
      courier_charge: number;
      payment: number;
      cash_payment: number;
      deposit_payment: number;
      pending_due_amount: number;
      pending_dues_count: number;
      loan_count: number;
      payment_count: number;
    };
    bname: string;
    execName: string;
    date: string;
  };
}

const fmt = (n: number) => Number(n).toFixed(2).toLocaleString("en-LK");

const ProductPurchases = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

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

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductDayEndRow[]>([]);
  const [totals, setTotals] = useState<
    ProductDayEndResponse["data"]["totals"] | null
  >(null);

  const [error, setError] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  // ── Read URL params (same pattern as DayEndReport) ───────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBname = params.get("bname");
    const urlName = params.get("name") || params.get("execName");

    if (urlBname && urlName) {
      setBname(urlBname);
      setExecName(urlName);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBname = params.get("bname");
    const urlName = params.get("name") || params.get("execName");

    if (urlBname && urlName && bname === urlBname && execName === urlName) {
      loadProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bname, execName]);

  // ── Load branches + users (role-scoped, same as DayEndReport) ─
  useEffect(() => {
    if (!user) return;

    fetchBranches({
      role: user.status,
      userId: user.id.toString(),
      bname: user.bname,
    })
      .then((branches: Branch[]) => {
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

  // Check if user is a KEGALLE executive/manager (access to both KEGALLE and NARAMMALA)
  const isKegalleExecutive =
    isExecutive && user?.bname?.toUpperCase() === "KEGALLE";
  const isKegalleManager =
    isBranchManager && user?.bname?.toUpperCase() === "KEGALLE";

  // Show branch dropdown for: Admin, Regional, KEGALLE Branch Manager, or KEGALLE Executive
  const showFilters =
    isAdmin || isRegional || isKegalleManager || isKegalleExecutive;

  // Show executive dropdown ONLY for Admins, Regional Managers, and KEGALLE Branch Managers
  const showExecDropdown = isAdmin || isRegional || isKegalleManager;

  const loadProductData = useCallback(async () => {
    if (!date || !bname || !execName) return;

    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const execID = user?.id ? String(user.id) : "";
      const params = new URLSearchParams({
        date,
        bname,
        execName,
        execID,
        role: user?.status || "",
      });

      const res = await fetch(
        `https://purchase.goldenasia.lk/api/report/product-day-end?${params}`,
      );
      const data: ProductDayEndResponse = await res.json();

      if (!res.ok) {
        throw new Error(
          data.success === false
            ? (data as any).error || "Failed to load product data"
            : "Failed to load product data",
        );
      }

      if (data.success && data.data) {
        setRows(data.data.rows || []);
        setTotals(data.data.totals);
      } else {
        setRows([]);
        setTotals(null);
      }
    } catch (err: any) {
      console.error("Error loading product purchases:", err);
      setError(err.message || "Failed to load product purchases");
      setRows([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, [date, bname, execName, user]);

  // Auto-load for branch_manager/executive (locked identity, no manual generate needed)
  useEffect(() => {
    if ((isBranchManager || isExecutive) && date && bname && execName) {
      loadProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, bname]);

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Product Purchases Filters
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
                    setTotals(null);
                    setHasSearched(false);
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
              onClick={loadProductData}
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

      {/* Results */}
      {loading && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-gray-500">
                Loading product purchases...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-sm">⚠️ {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && hasSearched && !rows.length && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center text-sm text-gray-500">
            No product purchase records found for this selection.
          </CardContent>
        </Card>
      )}

      {!loading && !error && rows.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package size={18} className="text-primary" />
                Product Purchases — {bname} / {execName} — {date}
                <Badge className="bg-blue-100 text-blue-700 border-0 ml-2">
                  {rows.length} Centers
                </Badge>
              </CardTitle>
              {totals && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium text-gray-600">
                    Total Loans:{" "}
                    <span className="text-primary font-bold">
                      {totals.loan_count}
                    </span>
                  </span>
                  <span className="font-medium text-gray-600">
                    Total Amount:{" "}
                    <span className="text-primary font-bold">
                      Rs. {fmt(totals.total_loan_amount)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[1200px]">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-gray-700"
                        rowSpan={2}
                      >
                        Center
                      </th>
                      <th
                        className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-gray-700"
                        rowSpan={2}
                      >
                        View
                      </th>
                      <th
                        className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-gray-700"
                        rowSpan={2}
                      >
                        Center Name
                      </th>

                      <th
                        className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-indigo-600"
                        colSpan={2}
                      >
                        Product Loans
                      </th>
                      <th
                        className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-amber-600"
                        colSpan={2}
                      >
                        Fees
                      </th>
                      <th
                        className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-green-600"
                        colSpan={3}
                      >
                        Payments
                      </th>
                    </tr>
                    <tr>
                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-indigo-500">
                        Count
                      </th>
                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-indigo-500">
                        Total Amt
                      </th>

                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-amber-500">
                        Doc Fee
                      </th>
                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-amber-500">
                        Courier
                      </th>
                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-green-500">
                        Cash
                      </th>
                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-green-500">
                        CDK/Online
                      </th>
                      <th className="px-2 py-2 text-xs font-semibold text-white whitespace-nowrap text-center border border-gray-300 bg-green-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const isEven = index % 2 === 0;

                      return (
                        <tr
                          key={row.ccode}
                          className={isEven ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200 text-gray-600 font-mono">
                            {row.ccode}
                          </td>
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            <button
                              onClick={() => {
                                const params = new URLSearchParams({
                                  date,
                                  branch: bname,
                                  exec: execName,
                                  center: row.center,
                                  type: "product",
                                });
                                window.open(
                                  `/dashboard/center-payments?${params.toString()}`,
                                  "_blank",
                                );
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                              title={`View ${row.center} product details`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-2 py-2 text-xs text-left whitespace-nowrap border border-gray-200 text-gray-800 font-medium">
                            {row.center}
                          </td>

                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            {row.loan_count}
                          </td>
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            {fmt(row.total_loan_amount)}
                          </td>

                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            {fmt(row.document_fee)}
                          </td>
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            {fmt(row.courier_charge)}
                          </td>
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            {fmt(row.cash_payment)}
                          </td>
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                            {fmt(row.deposit_payment)}
                          </td>
                          <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200 font-semibold">
                            {fmt(row.payment)}
                          </td>
                        </tr>
                      );
                    })}

                    {totals && (
                      <tr className="bg-amber-50 font-bold border-t-2 border-amber-300">
                        <td
                          className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200 text-amber-700 font-bold"
                          colSpan={3}
                        >
                          Total
                        </td>

                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                          {totals.loan_count}
                        </td>
                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                          {fmt(totals.total_loan_amount)}
                        </td>

                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                          {fmt(totals.document_fee)}
                        </td>
                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                          {fmt(totals.courier_charge)}
                        </td>
                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                          {fmt(totals.cash_payment)}
                        </td>
                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200">
                          {fmt(totals.deposit_payment)}
                        </td>
                        <td className="px-2 py-2 text-xs text-center whitespace-nowrap border border-gray-200 font-bold">
                          {fmt(totals.payment)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totals && (
              <div className="p-4 bg-blue-50 border-t border-blue-200 flex flex-col sm:flex-row gap-3 text-sm flex-wrap">
                <span className="font-semibold text-gray-700">
                  Total Product Loans:{" "}
                  <span className="text-primary font-bold">
                    {totals.loan_count}
                  </span>
                </span>
                <span className="hidden sm:block text-gray-300">|</span>
                <span className="font-semibold text-gray-700">
                  Total Loan Amount:{" "}
                  <span className="text-primary font-bold">
                    Rs. {fmt(totals.total_loan_amount)}
                  </span>
                </span>
                <span className="hidden sm:block text-gray-300">|</span>
                <span className="font-semibold text-gray-700">
                  Total Payments:{" "}
                  <span className="text-green-600 font-bold">
                    Rs. {fmt(totals.payment)}
                  </span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductPurchases;
