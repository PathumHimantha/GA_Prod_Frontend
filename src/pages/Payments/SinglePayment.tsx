import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import {
  FileText,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  Upload,
  File,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/apiConfig";
import { useFloatCheck } from "@/lib/useFloatCheck";
import { FloatWarningBanner } from "@/components/FloatWarningBanner";

interface ProductOrder {
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
  loan_balance: number;
  payment: number;
  due_amount: number;
}

interface CustomerInfo {
  nic: string;
  name: string;
  loanCode: string;
  orderCode: string;
  productId: string;
  totalAmount: number;
  weekPayment: number;
  balance: number;
}

const SinglePayment = () => {
  const { user } = useAuth();

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toISOString().split("T")[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [customerFound, setCustomerFound] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [orderData, setOrderData] = useState<ProductOrder | null>(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cdkNumber, setCdkNumber] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Float Check ──
  const { canSubmitLoan, floatReason, checkingFloat } = useFloatCheck(
    user?.bname || "",
    user?.name || "",
    user?.id?.toString() || "",
    dateStr,
    !!user,
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Please enter NIC, customer code, or loan code");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/loans?customer_nic=${encodeURIComponent(searchQuery)}&limit=10`,
      );

      if (!response.ok) {
        throw new Error("Failed to search customer");
      }

      const data = await response.json();

      if (!data.success || data.data.length === 0) {
        setCustomerFound(false);
        setCustomerInfo(null);
        setOrderData(null);
        setSearchError("No customer found with this NIC or loan code");
        return;
      }

      const loan = data.data[0];

      const orderResponse = await fetch(
        `${API_BASE_URL}/loans/orders/${loan.loan_code}`,
      );

      let order = null;
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        if (orderData.success) {
          order = orderData.data;
        }
      }

      if (parseFloat(loan.loan_balance || 0) <= 0) {
        setCustomerFound(false);
        setCustomerInfo(null);
        setOrderData(null);
        setSearchError("This loan has already been fully paid");
        return;
      }

      setOrderData(order);
      setCustomerInfo({
        nic: loan.customer_nic,
        name: loan.customer_name,
        loanCode: loan.loan_code,
        orderCode: order?.order_code || "",
        productId: loan.product_id || "",
        totalAmount: parseFloat(loan.total_amount || 0),
        weekPayment: parseFloat(loan.week_payment || 0),
        balance: parseFloat(loan.loan_balance || 0),
      });

      setCustomerFound(true);
      setPaymentAmount("");
      setSelectedPaymentMethod("");
      setSlipFile(null);
      setSlipPreview(null);
      setCdkNumber("");
    } catch (err) {
      console.error(err);
      setSearchError("Error searching customer");
      setCustomerFound(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setCustomerFound(false);
    setCustomerInfo(null);
    setOrderData(null);
    setSelectedPaymentMethod("");
    setPaymentAmount("");
    setSearchError("");
    setSuccessMessage("");
    setErrorMessage("");
    setSlipFile(null);
    setSlipPreview(null);
    setCdkNumber("");
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSlipFile(file);

    if (file) {
      // Create preview for image files
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSlipPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setSlipPreview(null);
      }
    } else {
      setSlipPreview(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmitLoan) {
      setErrorMessage("Cannot submit payment: Float not submitted for today.");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setErrorMessage("Please enter a valid payment amount.");
      return;
    }

    if (!selectedPaymentMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }

    if (parseFloat(paymentAmount) > (customerInfo?.balance || 0)) {
      setErrorMessage(
        `Payment amount cannot exceed balance of Rs. ${customerInfo?.balance?.toFixed(2)}`,
      );
      return;
    }

    if (
      ["CDK", "Online Payment", "Bank Deposit"].includes(
        selectedPaymentMethod,
      ) &&
      !slipFile
    ) {
      setErrorMessage("Please attach a slip for this payment method.");
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("loanCode", customerInfo?.loanCode || "");
      formData.append("orderCode", customerInfo?.orderCode || "");
      formData.append("customerNic", customerInfo?.nic || "");
      formData.append("customerName", customerInfo?.name || "");
      formData.append("payment", paymentAmount);
      formData.append(
        "weekPayment",
        customerInfo?.weekPayment?.toString() || "0",
      );
      formData.append("paymentMethod", selectedPaymentMethod);
      formData.append("created_by", user?.id?.toString() || "system");

      // Append slip file if exists
      if (slipFile) {
        formData.append("slip", slipFile);
      }

      const response = await fetch(`${API_BASE_URL}/payments/single`, {
        method: "POST",
        body: formData, // Using FormData for file upload
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(
          `✅ Payment of Rs. ${parseFloat(paymentAmount).toFixed(2)} recorded successfully.`,
        );
        setTimeout(() => {
          setSuccessMessage("");
          handleClear();
        }, 3000);
      } else {
        setErrorMessage(data.error || "Failed to record payment.");
        setTimeout(() => setErrorMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected error occurred.");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Single Product Payment
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Process individual customer product loan payments
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">{dateStr}</span>
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
          title="Single Payment Disabled"
          description="Float record not found for today. Please contact your branch manager."
        />

        {/* SEARCH */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <Label className="text-sm font-semibold text-gray-700">
              Search Customer by NIC or Loan Code
            </Label>

            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by NIC or Loan Code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 h-12"
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-12 px-6 gap-2"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>

              <Button
                variant="outline"
                onClick={handleClear}
                className="h-12 px-6 gap-2"
                disabled={submitting}
              >
                <XCircle className="w-4 h-4" />
                Clear
              </Button>
            </div>

            {searchError && (
              <div className="p-3 mt-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{searchError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info Card */}
        {customerFound && customerInfo && (
          <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-orange-50 to-amber-50">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Customer Name</p>
                  <p className="font-semibold text-gray-800">
                    {customerInfo.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">NIC</p>
                  <p className="font-mono text-sm text-gray-700">
                    {customerInfo.nic}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Loan Code</p>
                  <p className="font-mono text-sm text-gray-700">
                    {customerInfo.loanCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Product ID</p>
                  <p className="font-mono text-sm text-gray-700">
                    {customerInfo.productId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Week Payment</p>
                  <p className="font-semibold text-green-600">
                    Rs. {customerInfo.weekPayment.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="font-semibold text-gray-800">
                    Rs. {customerInfo.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Remaining Balance</p>
                  <p className="text-xl font-bold text-orange-600">
                    Rs. {customerInfo.balance.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PAYMENT FORM */}
        {customerFound && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Payment Details
              </CardTitle>
            </CardHeader>

            {successMessage && (
              <div className="p-3 mb-4 mx-5 text-green-700 bg-green-50 border border-green-200 rounded-lg">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 mb-4 mx-5 text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMessage}
              </div>
            )}

            <CardContent>
              <form className="space-y-6" onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment Method */}
                  <div>
                    <Label className="font-semibold">Payment Method</Label>
                    <Select
                      value={selectedPaymentMethod}
                      onValueChange={setSelectedPaymentMethod}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="CDK">CDK</SelectItem>
                        <SelectItem value="Online Payment">
                          Online Payment
                        </SelectItem>
                        <SelectItem value="Bank Deposit">
                          Bank Deposit
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div>
                    <Label className="font-semibold">Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter payment amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min={0}
                      max={customerInfo?.balance}
                      step="0.01"
                      required
                      disabled={submitting}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: Rs. {customerInfo?.balance?.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* CDK NUMBER */}
                {selectedPaymentMethod === "CDK" && (
                  <div>
                    <Label className="font-semibold">CDK Number</Label>
                    <Input
                      placeholder="Enter CDK Number"
                      value={cdkNumber}
                      onChange={(e) => setCdkNumber(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                {/* File Upload for Slip */}
                {(selectedPaymentMethod === "CDK" ||
                  selectedPaymentMethod === "Online Payment" ||
                  selectedPaymentMethod === "Bank Deposit") && (
                  <div>
                    <Label className="font-semibold">Attach Slip</Label>
                    <div className="mt-1">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleSlipChange}
                            className="w-full p-2 border border-gray-200 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                            disabled={submitting}
                          />
                        </div>
                        {slipFile && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <File className="w-4 h-4" />
                            <span className="truncate max-w-[150px]">
                              {slipFile.name}
                            </span>
                          </div>
                        )}
                      </div>
                      {slipPreview && (
                        <div className="mt-2">
                          <img
                            src={slipPreview}
                            alt="Slip Preview"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Supported formats: JPG, PNG, GIF, WebP, PDF (Max: 5MB)
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleClear}
                    disabled={submitting}
                  >
                    Clear
                  </Button>

                  <Button
                    type="submit"
                    className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!canSubmitLoan || checkingFloat || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Payment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TOTAL */}
        {customerFound && paymentAmount && parseFloat(paymentAmount) > 0 && (
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Payment Amount
              </span>
              <span className="text-xl font-bold text-orange-600">
                Rs. {parseFloat(paymentAmount || 0).toFixed(2)}
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
              Confirm Payment
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-gray-600">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-semibold text-gray-800">
                  {customerInfo?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loan Code</span>
                <span className="font-mono text-xs text-gray-700">
                  {customerInfo?.loanCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-semibold text-gray-800">
                  {selectedPaymentMethod}
                </span>
              </div>
              {cdkNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">CDK No.</span>
                  <span className="font-semibold text-gray-800">
                    {cdkNumber}
                  </span>
                </div>
              )}
              {slipFile && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Slip</span>
                  <span className="text-gray-700 text-xs truncate max-w-[150px]">
                    {slipFile.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 mt-1">
                <span className="font-medium">Amount</span>
                <span className="font-bold text-lg text-orange-600">
                  Rs. {parseFloat(paymentAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-amber-600">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
              onClick={handleConfirmSubmit}
              disabled={!canSubmitLoan || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SinglePayment;
