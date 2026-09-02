import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calendar,
  Building2,
  Loader2,
  MapPin,
  Printer,
  AlertCircle,
} from "lucide-react";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { getCenters, Center } from "@/lib/centerHelper";

interface Customer {
  customer_code: string;
  loan_amount: number;
  loan_balance: number;
  center: string;
  ccode: string;
  cname: string;
  week_payment: number;
  phone1: string;
  arrears?: number;
}

interface GroupedResults {
  [groupNumber: string]: Customer[];
}

import { API_BASE_URL } from "@/apiConfig";

const Repayment = () => {
  const { user } = useAuth();

  // Role flags
  const isAdmin = user?.status === "admin";
  const isBranchManager = user?.status === "branch_manager";
  const isExecutive = user?.status === "executive";
  const isKegalleManager = isBranchManager && user?.bname === "KEGALLE";

  // Form state
  const [formData, setFormData] = useState({
    branch: "",
    center: "",
    searchInput: "",
  });

  // Data state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [results, setResults] = useState<Customer[]>([]);

  // UI state
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Fetch branches on mount
  useEffect(() => {
    if (!user) return;

    fetchBranches({
      role: user.status,
      userId: user.id.toString(),
      bname: user.bname,
    }).then((branchesData) => {
      let filteredBranches = branchesData;

      if (isKegalleManager) {
        filteredBranches = branchesData.filter(
          (b) => b.bname === "KEGALLE" || b.bname === "NARAMMALA",
        );
      } else if (isBranchManager) {
        filteredBranches = branchesData.filter((b) => b.bname === user?.bname);
        if (user?.bname) {
          setFormData((prev) => ({ ...prev, branch: user.bname || "" }));
        }
      }

      setBranches(filteredBranches);
    });
  }, [user, isKegalleManager, isBranchManager]);

  // Fetch centers when branch changes
  useEffect(() => {
    if (!formData.branch) {
      setCenters([]);
      return;
    }

    const loadCenters = async () => {
      setLoadingCenters(true);
      try {
        const centersData = await getCenters(formData.branch);
        setCenters(centersData);
      } catch (error) {
        console.error("Error fetching centers:", error);
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, [formData.branch]);

  // Handle branch change
  const handleBranchChange = (value: string) => {
    setFormData({
      branch: value,
      center: "",
      searchInput: "",
    });
    setResults([]);
    setSearched(false);
  };

  // Handle center change
  const handleCenterChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      center: value,
      searchInput: value,
    }));
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      searchInput: e.target.value,
      center: "",
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.branch) {
      setError("Please select a branch");
      return;
    }

    if (!formData.searchInput.trim()) {
      setError("Please enter a center name or code");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const response = await fetch(`${API_BASE_URL}/report/repayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_input: formData.searchInput,
          branch: formData.branch,
          selected_date: new Date().toISOString().split("T")[0],
          user_role: user?.status,
          user_branch: user?.bname,
          user_name: user?.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data || []);
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

  const handlePrint = () => {
    const printContent = document.getElementById("printableArea");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
         body { margin: 5mm; padding-top: 22px; font-family: Arial, sans-serif; }
          @page { size: A4 landscape; margin: 3mm 5mm; }
          table { border: 1px solid black; border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border: 0.5px solid black; font-size: 6.5pt; padding: 0.5px 1px; text-align: left; height: 12.5px; overflow: hidden; }
          th { text-align: center; }
          td:nth-child(1), th:nth-child(1) { width: 55px; }
          td:nth-child(2), th:nth-child(2) { width: 70px; }
          td:nth-child(3), th:nth-child(3) { width: 38px; text-align: right; }
          td:nth-child(4), th:nth-child(4),
          td:nth-child(5), th:nth-child(5),
          td:nth-child(6), th:nth-child(6),
          td:nth-child(7), th:nth-child(7) { width: 39px; text-align: right; padding: 0 2px; }
          td:nth-child(n+8), th:nth-child(n+8) { width: 39px; }
          .empty-row { height: 12px; }
          h5 { margin: 0 0 2px 5px; font-size: 8pt; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Helper functions (exactly matching PHP)
  const formatCustomerName = (cname: string) => {
    const nameParts = cname.split(" ");
    const numParts = nameParts.length;

    if (numParts === 1) return nameParts[0];

    const initials = nameParts
      .slice(0, numParts - 1)
      .map((part) => part.charAt(0) + ".");
    return initials.join("") + nameParts[numParts - 1];
  };

  const getGroupNumber = (customerCode: string) => {
    const parts = customerCode.split("/");
    return parts[2] || "0";
  };

  const formatCurrency = (amount: number | string) => {
    // Convert to number, remove any non-numeric characters
    const numAmount =
      typeof amount === "string" ? parseFloat(amount) || 0 : amount || 0;
    return numAmount.toFixed(2);
  };

  // Group results by group number
  const groupedResults: GroupedResults = {};
  results.forEach((row) => {
    const groupNumber = getGroupNumber(row.customer_code);
    if (!groupedResults[groupNumber]) {
      groupedResults[groupNumber] = [];
    }
    groupedResults[groupNumber].push(row);
  });

  // Ensure at least 6 groups (matching PHP)
  const groupEntries = Object.entries(groupedResults);
  while (groupEntries.length < 6) {
    groupEntries.push([` ${groupEntries.length + 1}`, []]);
  }
  // Calculate page totals - ensure numeric values
  const pageTotals = results.reduce(
    (acc, curr) => ({
      totalLoanAmount:
        acc.totalLoanAmount +
        (typeof curr.loan_amount === "string"
          ? parseFloat(curr.loan_amount) || 0
          : curr.loan_amount || 0),
      totalDueAmount:
        acc.totalDueAmount +
        (typeof curr.week_payment === "string"
          ? parseFloat(curr.week_payment) || 0
          : curr.week_payment || 0),
      totalBalance:
        acc.totalBalance +
        (typeof curr.loan_balance === "string"
          ? parseFloat(curr.loan_balance) || 0
          : curr.loan_balance || 0),
      totalArrears:
        acc.totalArrears +
        (typeof curr.arrears === "string"
          ? parseFloat(curr.arrears) || 0
          : curr.arrears || 0),
    }),
    { totalLoanAmount: 0, totalDueAmount: 0, totalBalance: 0, totalArrears: 0 },
  );

  // Options for dropdowns
  const branchOptions: SelectOption[] = branches.map((b) => ({
    label: b.bname,
    value: b.bname,
  }));

  const centerOptions: SelectOption[] = centers.map((c) => ({
    label: c.center,
    value: c.center,
  }));

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6  mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">
            Repayment Schedule
          </h1>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded shadow">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Search Card */}
        <Card className="mb-6  mx-auto">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg">Search Repayment Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Branch Dropdown */}
              <div>
                <Label className="block mb-1 font-bold">Branch:</Label>
                <SearchableSelect
                  options={branchOptions}
                  value={formData.branch}
                  onChange={handleBranchChange}
                  placeholder="-- Select Branch --"
                />
              </div>

              {/* Center Dropdown */}
              <div>
                <Label className="block mb-1 font-bold">
                  Center (Optional):
                </Label>
                <SearchableSelect
                  options={centerOptions}
                  value={formData.center}
                  onChange={handleCenterChange}
                  placeholder={
                    formData.branch
                      ? loadingCenters
                        ? "Loading..."
                        : "-- Select Center --"
                      : "Select branch first"
                  }
                  disabled={!formData.branch || loadingCenters}
                />
              </div>

              {/* Center Name/Code Input */}
              <div>
                <Label className="block mb-1 font-bold">
                  Center Name or Code:
                </Label>
                <Input
                  type="text"
                  value={formData.searchInput}
                  onChange={handleSearchChange}
                  placeholder="Enter center name or code..."
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-[#FAA300] hover:bg-black text-white"
                  disabled={
                    loading || !formData.branch || !formData.searchInput
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search"
                  )}
                </Button>
                {results.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                )}
              </div>
            </form>

            {error && (
              <div className="mt-4 p-2 bg-red-100 border border-red-300 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table - Print Area */}
        {results.length > 0 && (
          <div>
            {/* ── Screen view — better UI ── */}
            <div className="print:hidden mb-4" id="screenArea">
              <div className="bg-white rounded-xl shadow-md p-4 mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Center
                  </p>
                  <p className="text-base font-bold text-gray-800">
                    {results[0].center}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Center Code
                  </p>
                  <p className="text-base font-bold text-gray-800">
                    {results[0].ccode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Total Customers
                  </p>
                  <p className="text-base font-bold text-primary">
                    {results.length}
                  </p>
                </div>
              </div>

              {groupEntries.map(([groupNumber, groupRows]) => {
                if (groupRows.length === 0) return null;
                const groupTotals = groupRows.reduce(
                  (acc, curr) => ({
                    loanAmount:
                      acc.loanAmount +
                      (typeof curr.loan_amount === "string"
                        ? parseFloat(curr.loan_amount) || 0
                        : curr.loan_amount || 0),
                    dueAmount:
                      acc.dueAmount +
                      (typeof curr.week_payment === "string"
                        ? parseFloat(curr.week_payment) || 0
                        : curr.week_payment || 0),
                    balance:
                      acc.balance +
                      (typeof curr.loan_balance === "string"
                        ? parseFloat(curr.loan_balance) || 0
                        : curr.loan_balance || 0),
                    arrears:
                      acc.arrears +
                      (typeof curr.arrears === "string"
                        ? parseFloat(curr.arrears) || 0
                        : curr.arrears || 0),
                  }),
                  { loanAmount: 0, dueAmount: 0, balance: 0, arrears: 0 },
                );
                return (
                  <div
                    key={groupNumber}
                    className="bg-white rounded-xl shadow-sm mb-3 overflow-hidden"
                  >
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
                      <span className="text-xs font-bold text-amber-800 uppercase">
                        Group No: {groupNumber}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="text-left px-3 py-2 font-semibold">
                              Customer ID
                            </th>
                            <th className="text-left px-3 py-2 font-semibold">
                              Name
                            </th>
                            <th className="text-left px-3 py-2 font-semibold">
                              Phone
                            </th>
                            <th className="text-right px-3 py-2 font-semibold">
                              Loan Amt
                            </th>
                            <th className="text-right px-3 py-2 font-semibold">
                              Due Amt
                            </th>
                            <th className="text-right px-3 py-2 font-semibold">
                              Balance
                            </th>
                            <th className="text-right px-3 py-2 font-semibold">
                              Arrears
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-3 py-1.5 font-mono text-gray-600">
                                {row.customer_code}
                              </td>
                              <td className="px-3 py-1.5 font-medium text-gray-800">
                                {formatCustomerName(row.cname)}
                              </td>
                              <td className="px-3 py-1.5 text-gray-600">
                                {row.phone1 || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                {formatCurrency(row.loan_amount)}
                              </td>
                              <td className="px-3 py-1.5 text-right text-amber-700 font-semibold">
                                {formatCurrency(row.week_payment)}
                              </td>
                              <td className="px-3 py-1.5 text-right text-red-600 font-semibold">
                                {formatCurrency(row.loan_balance)}
                              </td>
                              <td className="px-3 py-1.5 text-right text-red-600 font-semibold">
                                {formatCurrency(row.arrears)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-amber-50 font-bold border-t border-amber-200">
                            <td className="px-3 py-1.5" colSpan={3}>
                              Group Total
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {formatCurrency(groupTotals.loanAmount)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-amber-700">
                              {formatCurrency(groupTotals.dueAmount)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-red-600">
                              {formatCurrency(groupTotals.balance)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Page totals */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Total Loan</p>
                  <p className="text-sm font-bold text-gray-800">
                    {formatCurrency(pageTotals.totalLoanAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Due</p>
                  <p className="text-sm font-bold text-amber-700">
                    {formatCurrency(pageTotals.totalDueAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Balance</p>
                  <p className="text-sm font-bold text-red-600">
                    {formatCurrency(pageTotals.totalBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Print view — exact PHP match ── */}
            <div id="printableArea">
              <h5
                style={{
                  marginLeft: 10,
                  marginBottom: 4,
                  marginTop: 0,
                  fontSize: 13,
                  fontWeight: "bold",
                }}
              >
                Center Number: {results[0].ccode} | Center: {results[0].center}
              </h5>
              <table className="repayment-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Customer Name</th>
                    <th>Contact NO</th>
                    <th>Loan Amount</th>
                    <th>Due Amount</th>
                    <th>Balance</th>
                    <th>Arrears</th>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <td key={i} className="fixed-width"></td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupEntries.map(([groupNumber, groupRows]) => {
                    const groupTotals = groupRows.reduce(
                      (acc, curr) => ({
                        loanAmount:
                          acc.loanAmount +
                          (typeof curr.loan_amount === "string"
                            ? parseFloat(curr.loan_amount) || 0
                            : curr.loan_amount || 0),
                        dueAmount:
                          acc.dueAmount +
                          (typeof curr.week_payment === "string"
                            ? parseFloat(curr.week_payment) || 0
                            : curr.week_payment || 0),
                        balance:
                          acc.balance +
                          (typeof curr.loan_balance === "string"
                            ? parseFloat(curr.loan_balance) || 0
                            : curr.loan_balance || 0),
                        arrears:
                          acc.arrears +
                          (typeof curr.arrears === "string"
                            ? parseFloat(curr.arrears) || 0
                            : curr.arrears || 0),
                      }),
                      { loanAmount: 0, dueAmount: 0, balance: 0, arrears: 0 },
                    );
                    return (
                      <>
                        <tr>
                          <td colSpan={14} style={{ textAlign: "left" }}>
                            <strong>Group No: {groupNumber}</strong>
                          </td>
                        </tr>
                        {groupRows.map((row, idx) => (
                          <tr key={idx} className="empty-row">
                            <td
                              className="fixed-width"
                              style={{ textAlign: "left" }}
                            >
                              {row.customer_code}
                            </td>
                            <td
                              className="fixed-width"
                              style={{ textAlign: "left" }}
                            >
                              {formatCustomerName(row.cname)}
                            </td>
                            <td style={{ textAlign: "right", padding: 0 }}>
                              {row.phone1 || ""}
                            </td>
                            <td
                              className="fixed-width"
                              style={{ padding: 0, textAlign: "right" }}
                            >
                              {Number(row.loan_amount).toFixed(2)}
                            </td>
                            <td
                              className="fixed-width"
                              style={{ padding: 0, textAlign: "right" }}
                            >
                              {Number(row.week_payment).toFixed(2)}
                            </td>
                            <td
                              className="fixed-width"
                              style={{ padding: 0, textAlign: "right" }}
                            >
                              {Number(row.loan_balance).toFixed(2)}
                            </td>
                            <td
                              className="fixed-width"
                              style={{ padding: 0, textAlign: "right" }}
                            >
                              {Number(row.arrears || 0).toFixed(2)}
                            </td>
                            {Array.from({ length: 7 }).map((_, i) => (
                              <td key={i} className="fixed-width"></td>
                            ))}
                          </tr>
                        ))}
                        {Array.from({
                          length: Math.max(0, 5 - groupRows.length),
                        }).map((_, idx) => (
                          <tr
                            key={`empty-${groupNumber}-${idx}`}
                            className="empty-row"
                          >
                            {Array.from({ length: 14 }).map((_, i) => (
                              <td key={i} className="fixed-width"></td>
                            ))}
                          </tr>
                        ))}
                        <tr className="empty-row">
                          <td>
                            <strong>Totals</strong>
                          </td>
                          <td></td>
                          <td></td>
                          <td style={{ padding: 0, textAlign: "center" }}>
                            <strong>{groupTotals.loanAmount.toFixed(2)}</strong>
                          </td>
                          <td style={{ padding: 0, textAlign: "center" }}>
                            <strong>{groupTotals.dueAmount.toFixed(2)}</strong>
                          </td>
                          <td style={{ padding: 0, textAlign: "center" }}>
                            <strong>{groupTotals.balance.toFixed(2)}</strong>
                          </td>
                          <td style={{ padding: 0, textAlign: "center" }}>
                            <strong>{groupTotals.arrears.toFixed(2)}</strong>
                          </td>
                          {Array.from({ length: 7 }).map((_, i) => (
                            <td key={i} className="fixed-width"></td>
                          ))}
                        </tr>
                      </>
                    );
                  })}
                  <tr className="empty-row">
                    <td>
                      <strong>Page Due</strong>
                    </td>
                    <td></td>
                    <td></td>
                    <td style={{ padding: 0, textAlign: "center" }}>
                      <strong>{pageTotals.totalLoanAmount.toFixed(2)}</strong>
                    </td>
                    <td style={{ padding: 0, textAlign: "center" }}>
                      <strong>{pageTotals.totalDueAmount.toFixed(2)}</strong>
                    </td>
                    <td style={{ padding: 0, textAlign: "center" }}>
                      <strong>{pageTotals.totalBalance.toFixed(2)}</strong>
                    </td>
                    <td style={{ padding: 0, textAlign: "center" }}>
                      <strong>{pageTotals.totalArrears.toFixed(2)}</strong>
                    </td>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <td key={i} className="fixed-width"></td>
                    ))}
                  </tr>
                  {["Executive", "Field Manager", "Finance Officer"].map(
                    (label) => (
                      <tr key={label} className="empty-row">
                        <td>
                          <strong>{label}</strong>
                        </td>
                        <td colSpan={5}></td>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <td key={i} className="fixed-width"></td>
                        ))}
                        <td></td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              {/* Add timestamp and printed by after the table */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "5px",
                  fontSize: "9pt",
                }}
              >
                <p style={{ margin: 0, marginLeft: "5px" }}>
                  <strong>Executive :</strong>{" "}
                  {user?.name || user?.name || "Unknown"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Date - Time:</strong>{" "}
                  {new Date(new Date().getTime()).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
  #printableArea {
    display: none;
  }
`}</style>
    </div>
  );
};

export default Repayment;
