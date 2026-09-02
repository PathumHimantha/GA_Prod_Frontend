import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Search, CheckCircle2 } from "lucide-react";
import { PaymentsTable } from "@/components/cashier/PaymentsTable";
import SearchableSelect from "@/components/SearchableSelect";
import { fetchBranches } from "@/lib/branchHelpers";
import { getCenters } from "@/lib/centerHelper";
import { getCustomersByCenter, submitBulkPayments } from "@/lib/paymentsHelper";
import { useFloatCheck } from "@/lib/useFloatCheck";
import { FloatWarningBanner } from "@/components/FloatWarningBanner";

const CashierPayments = () => {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toISOString().split("T")[0];

  const [branchOptions, setBranchOptions] = useState([]);
  const [centerOptions, setCenterOptions] = useState([]);

  const [formData, setFormData] = useState({
    branch: user?.bname || "",
    center: "",
  });

  const [tableData, setTableData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Float Check ──
  const { canSubmitLoan, floatReason, checkingFloat } = useFloatCheck(
    user?.bname || "",
    user?.name || "",
    user?.id?.toString() || "",
    dateStr,
    !!user, // Only enable if user exists
  );

  /*
  ---------------------------
  LOAD BRANCHES
  ---------------------------
  */
  useEffect(() => {
    const loadBranches = async () => {
      const branches = await fetchBranches({
        role: user.status,
        userId: user.id.toString(),
        bname: user.bname,
      });

      setBranchOptions(
        branches.map((b) => ({
          label: b.bname,
          value: b.bname,
          sub: b.bcode,
        })),
      );
    };

    if (user) {
      loadBranches();
    }
  }, [user]);

  /*
  ---------------------------
  LOAD CENTERS WHEN BRANCH CHANGES
  ---------------------------
  */
  useEffect(() => {
    if (!formData.branch) return;

    const loadCenters = async () => {
      setLoadingCenters(true);

      const centers = await getCenters(formData.branch, undefined, user?.id);

      setCenterOptions(
        centers.map((c: any) => ({
          label: c.center,
          value: c.center,
        })),
      );

      setLoadingCenters(false);
    };

    loadCenters();
  }, [formData.branch]);

  /*
  ---------------------------
  LOAD CUSTOMERS
  ---------------------------
  */
  useEffect(() => {
    if (!formData.branch || !formData.center) return;

    const loadCustomers = async () => {
      const customers = await getCustomersByCenter(
        formData.branch,
        formData.center,
      );

      // Get today's date for comparison
      const today = new Date().toISOString().split("T")[0];

      const formatted = customers.map((c: any) => {
        // Calculate status based on due_date
        const status = c.due_date < today ? "LAP" : "ACTIVE";

        return {
          loanCode: c.loan_code || "",
          customerCode: c.customer_code || "",
          cname: c.cname || "",
          amount: c.loan_amount ?? 0,
          loanDate: c.loan_date ?? "",
          weeklyPayment: c.week_payment ?? 0,
          payment: 0,
          balance: c.loan_balance,
          dueDate: c.due_date ?? "",
          arrears: c.arrears ?? 0,
          status: status,
        };
      });

      setTableData(formatted);
    };

    loadCustomers();
  }, [formData.branch, formData.center]);

  /*
  ---------------------------
  HANDLERS
  ---------------------------
  */
  const handleBranchChange = (value: string) => {
    setFormData({
      branch: value,
      center: "",
    });
  };

  const handleCenterChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      center: value,
    }));
  };

  const handlePaymentChange = (index: number, value: number) => {
    const newData = [...tableData];
    const maxAllowed = newData[index].balance ?? Infinity;
    // Cap at loan balance
    newData[index].payment = Math.min(value, maxAllowed);
    setTableData(newData);
  };

  /*
  ---------------------------
  SEARCH FILTER
  ---------------------------
  */
  const filteredData = tableData.filter(
    (row: any) =>
      row.cname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.loanCode.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  /*
  ---------------------------
  TOTAL PAYMENTS
  ---------------------------
  */
  const totalPayments = tableData.reduce(
    (sum: number, row: any) => sum + row.payment,
    0,
  );

  const handleSubmitClick = () => {
    const hasPayments = tableData.some((r) => r.payment > 0);
    if (!hasPayments) return;
    if (!canSubmitLoan) {
      setErrorMessage("Cannot submit payments: Float not submitted for today.");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    const payments = tableData.map((r) => ({
      loanCode: r.loanCode,
      customerCode: r.customerCode,
      name: r.cname,
      payment: r.payment,
      exname: user?.name,
    }));

    try {
      const success = await submitBulkPayments(payments);
      if (success) {
        setSuccessMessage("Payments recorded successfully.");
        setTimeout(() => {
          setSuccessMessage("");
          setTableData([]);
        }, 2000);
      } else {
        setErrorMessage("Failed to record payments.");
        setTimeout(() => setErrorMessage(""), 2000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Unexpected error occurred.");
      setTimeout(() => setErrorMessage(""), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Cashier Payments
            </h1>
            <p className="text-sm text-gray-500">
              Manage and process customer payments
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{dateStr}</span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {dayName}
            </span>
          </div>
        </div>

        {/* ── Float Warning Banner ── */}
        <FloatWarningBanner
          checkingFloat={checkingFloat}
          canSubmitLoan={canSubmitLoan}
          floatReason={floatReason}
          title="Cashier Payments Disabled"
          description="Float record not found for today. Please contact your branch manager."
        />

        {/* BRANCH / CENTER */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Select Branch</Label>
                <SearchableSelect
                  options={branchOptions}
                  value={formData.branch}
                  onChange={handleBranchChange}
                  placeholder="Search and select a branch"
                />
              </div>

              <div>
                <Label>Select Center</Label>
                <SearchableSelect
                  options={centerOptions}
                  value={formData.center}
                  onChange={handleCenterChange}
                  placeholder={
                    formData.branch
                      ? loadingCenters
                        ? "Loading..."
                        : "Search center..."
                      : "Select branch first"
                  }
                  disabled={!formData.branch || loadingCenters}
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-primary/5 rounded-lg text-sm">
              <b>{formData.branch}</b> - <b>{formData.center}</b>
            </div>

            {/* SUCCESS / ERROR MESSAGES */}
            {successMessage && (
              <div className="mb-4 mt-2 p-4 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-4 mt-2 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center gap-2">
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEARCH */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, customer code, loan code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-12"
            />
          </div>
        </div>

        {/* TABLE */}
        <PaymentsTable
          data={filteredData}
          onPaymentChange={handlePaymentChange}
        />

        {/* FOOTER */}
        <div className="mt-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-lg font-semibold">
                Total Payments: Rs. {totalPayments.toFixed(2)}
              </div>

              <Button
                size="lg"
                onClick={handleSubmitClick}
                className="w-full sm:w-auto"
                disabled={!canSubmitLoan || checkingFloat}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Payments
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CONFIRMATION MODAL */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Confirm Payments
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                You are about to submit payments for{" "}
                <b>
                  {tableData.filter((r) => r.payment > 0).length} customer(s)
                </b>
                .
              </p>
              <div className="bg-primary/5 rounded-xl p-4 mb-5 text-center">
                <p className="text-xs text-gray-500 mb-1">
                  Total Payment Amount
                </p>
                <p className="text-2xl font-bold text-primary">
                  Rs. {totalPayments.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmSubmit}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierPayments;
