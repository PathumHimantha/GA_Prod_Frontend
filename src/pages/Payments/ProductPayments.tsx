import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Search,
  CheckCircle2,
  Package,
  User,
  Phone,
  DollarSign,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import SearchableSelect from "@/components/SearchableSelect";
import { fetchBranches } from "@/lib/branchHelpers";
import { getCenters } from "@/lib/centerHelper";
import { useFloatCheck } from "@/lib/useFloatCheck";
import { FloatWarningBanner } from "@/components/FloatWarningBanner";

type ProductOrder = {
  id: number;
  order_code: string;
  loan_code: string;
  product_id: string;
  customer_nic: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  quantity: number;
  price: number;
  total_amount: number;
  week_payment: number;
  period_weeks: number;
  order_status: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  courier_charge: number;
  product_weight: number;
};

type PaymentItem = {
  orderCode: string;
  loanCode: string;
  customerName: string;
  customerNic: string;
  customerPhone: string;
  customerAddress: string;
  productId: string;
  totalAmount: number;
  weekPayment: number;
  periodWeeks: number;
  payment: number;
  status: string;
  orderStatus: string;
};

const ProductPayments = () => {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toISOString().split("T")[0];

  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [tableData, setTableData] = useState<PaymentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [totalPayments, setTotalPayments] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Branch & Center States
  const [branchOptions, setBranchOptions] = useState([]);
  const [centerOptions, setCenterOptions] = useState([]);
  const [formData, setFormData] = useState({
    branch: user?.bname || "",
    center: "",
  });
  const [loadingCenters, setLoadingCenters] = useState(false);

  // ── Float Check ──
  const { canSubmitLoan, floatReason, checkingFloat } = useFloatCheck(
    user?.bname || "",
    user?.name || "",
    user?.id?.toString() || "",
    dateStr,
    !!user,
  );

  // Load Branches
  useEffect(() => {
    const loadBranches = async () => {
      const branches = await fetchBranches({
        role: user?.status,
        userId: user?.id?.toString(),
        bname: user?.bname,
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

  // Load Centers when branch changes
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
  }, [formData.branch, user?.id]);

  // Fetch product orders when branch or center changes
  useEffect(() => {
    if (!formData.branch || !formData.center) {
      setTableData([]);
      setOrders([]);
      return;
    }

    loadOrders();
  }, [formData.branch, formData.center]);

  const loadOrders = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      // Get orders with branch and center filter
      const params = new URLSearchParams();
      params.append("order_status", "pending");
      if (formData.branch) params.append("bname", formData.branch);
      if (formData.center) params.append("center", formData.center);

      const response = await fetch(
        `${API_BASE_URL}/loans/orders?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();

      if (data.success) {
        setOrders(data.data || []);
        // Format orders for table
        const formatted = data.data.map((order: any) => ({
          orderCode: order.order_code || "",
          loanCode: order.loan_code || "",
          customerName: order.customer_name || "",
          customerNic: order.customer_nic || "",
          customerPhone: order.customer_phone || "",
          customerAddress: order.customer_address || "",
          productId: order.product_id || "",
          totalAmount: parseFloat(order.total_amount || 0),
          weekPayment: parseFloat(order.week_payment || 0),
          periodWeeks: parseInt(order.period_weeks || 13),
          payment: 0,
          status: order.order_status || "pending",
          orderStatus: order.order_status || "pending",
        }));
        setTableData(formatted);
        setTotalPayments(0);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      setErrorMessage("Failed to load product orders");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChange = (index: number, value: number) => {
    const newData = [...tableData];
    const maxAllowed = newData[index].weekPayment || Infinity;
    newData[index].payment = Math.min(value, maxAllowed);
    setTableData(newData);

    const total = newData.reduce((sum, row) => sum + row.payment, 0);
    setTotalPayments(total);
  };

  const handleBranchChange = (value: string) => {
    setFormData({
      branch: value,
      center: "",
    });
    setTableData([]);
    setTotalPayments(0);
  };

  const handleCenterChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      center: value,
    }));
  };

  const filteredData = tableData.filter(
    (row: any) =>
      row.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.customerNic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.loanCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.productId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSubmitClick = () => {
    const hasPayments = tableData.some((r) => r.payment > 0);
    if (!hasPayments) {
      setErrorMessage("No payments to submit. Please enter payment amounts.");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }
    if (!canSubmitLoan) {
      setErrorMessage("Cannot submit payments: Float not submitted for today.");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);

    const payments = tableData
      .filter((r) => r.payment > 0)
      .map((r) => ({
        orderCode: r.orderCode,
        loanCode: r.loanCode,
        customerNic: r.customerNic,
        customerName: r.customerName,
        payment: r.payment,
        weekPayment: r.weekPayment,
        totalAmount: r.totalAmount,
        created_by: user?.id?.toString() || "system",
      }));

    try {
      const response = await fetch(`${API_BASE_URL}/payments/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payments, userId: user?.id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(
          `✅ ${data.data?.count || payments.length} payment(s) recorded successfully.`,
        );
        setTimeout(() => {
          setSuccessMessage("");
          loadOrders();
          setTotalPayments(0);
        }, 3000);
      } else {
        setErrorMessage(data.error || "Failed to record payments.");
        setTimeout(() => setErrorMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Unexpected error occurred.");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const totalWeekPayments = filteredData.reduce(
    (sum, row) => sum + row.weekPayment,
    0,
  );
  const totalPaid = filteredData.reduce((sum, row) => sum + row.payment, 0);

  // Get unique customers count
  const uniqueCustomers = useMemo(() => {
    const unique = new Set(filteredData.map((row) => row.customerNic));
    return unique.size;
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Product Payments
            </h1>
            <p className="text-sm text-gray-500">
              Manage and process customer product loan payments
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
          title="Product Payments Disabled"
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

            {formData.branch && formData.center && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg text-sm">
                <b>{formData.branch}</b> - <b>{formData.center}</b>
                <span className="ml-4 text-gray-500">
                  • {filteredData.length} orders • {uniqueCustomers} customers
                </span>
              </div>
            )}

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

        {/* Summary Cards */}
        {!loading && filteredData.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredData.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Week Payments</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rs. {totalWeekPayments.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rs. {totalPaid.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SEARCH */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by customer name, NIC, order code, loan code, product ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-12 bg-white"
            />
          </div>
        </div>

        {/* TABLE */}
        <Card className="mb-4 border-0 shadow-lg overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NIC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Code
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Week Payment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-orange-500"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Loading orders...
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      {formData.branch && formData.center
                        ? "No pending orders found for this branch and center"
                        : "Please select a branch and center to view orders"}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {row.customerName}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {row.customerPhone || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {row.customerNic}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {row.productId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {row.orderCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        Rs. {row.weekPayment.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        Rs. {row.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <Input
                            type="number"
                            min="0"
                            max={row.weekPayment}
                            step="0.01"
                            value={row.payment}
                            onChange={(e) =>
                              handlePaymentChange(
                                index,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-28 text-center h-8"
                            placeholder="0.00"
                            disabled={!canSubmitLoan || submitting}
                          />
                          <span className="text-xs text-gray-400">
                            / {row.weekPayment.toFixed(0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <div className="mt-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-lg font-semibold">
                  Total Payments:{" "}
                  <span className="text-green-600">
                    Rs. {totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {filteredData.filter((r) => r.payment > 0).length} of{" "}
                  {filteredData.length} orders paying
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleSubmitClick}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
                disabled={
                  totalPaid === 0 ||
                  submitting ||
                  !canSubmitLoan ||
                  checkingFloat
                }
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Payments
                  </>
                )}
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
                <b>{tableData.filter((r) => r.payment > 0).length} order(s)</b>.
              </p>
              <div className="bg-orange-50 rounded-xl p-4 mb-5 text-center">
                <p className="text-xs text-gray-500 mb-1">
                  Total Payment Amount
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  Rs. {totalPaid.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPayments;
