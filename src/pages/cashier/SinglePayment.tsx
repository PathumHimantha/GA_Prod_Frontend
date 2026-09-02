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
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PaymentsTable } from "@/components/cashier/PaymentsTable";
import {
  searchCustomer,
  searchCustomerforpayments,
} from "@/lib/paymentsHelper";
import { submitPayment } from "@/lib/paymentsHelper";
import { API_BASE_URL } from "@/apiConfig";
import FileUploadField from "@/components/FileUploadField";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { useFloatCheck } from "@/lib/useFloatCheck";
import { FloatWarningBanner } from "@/components/FloatWarningBanner";

interface PaymentRow {
  loanCode: string;
  customerCode: string;
  cname: string;
  amount: number;
  loanDate: string;
  weeklyPayment: number;
  thisWeekPayment: number;
  payment: number;
  balance: number;
  dueDate: string;
  arrears: number;
}

interface CustomerInfo {
  nic?: string;
  name?: string;
  cname?: string;
  loanId: string;
  outstandingBalance: number;
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

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tableData, setTableData] = useState<PaymentRow[]>([]);
  const [filteredData, setFilteredData] = useState<PaymentRow[]>([]);
  const [cdkNumber, setCdkNumber] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const totalPayments = parseFloat(paymentAmount) || 0;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deathFiles, setDeathFiles] = useState<{
    marriage_certificate: File | null;
    bank_passbook: File | null;
    death_certificate: File | null;
    donation_request_letter: File | null;
  }>({
    marriage_certificate: null,
    bank_passbook: null,
    death_certificate: null,
    donation_request_letter: null,
  });

  // ── Float Check ──
  const { canSubmitLoan, floatReason, checkingFloat } = useFloatCheck(
    user?.bname || "",
    user?.name || "",
    user?.id?.toString() || "",
    dateStr,
    !!user, // Only enable if user exists
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError("Please enter NIC, customer code, or loan code");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const customers = await searchCustomerforpayments(searchQuery);

      if (customers.length === 0) {
        setCustomerFound(false);
        setFilteredData([]);
        setCustomerInfo(null);
        setSearchError("No customer found");
        return;
      }

      const formatted: PaymentRow[] = customers.map((c) => ({
        loanCode: c.loan_code || "",
        customerCode: c.customer_code || "",
        cname: c.cname || "",
        amount: c.loan_amount ?? 0,
        loanDate: c.loan_date ?? "",
        weeklyPayment: c.week_payment ?? 0,
        thisWeekPayment: 0,
        payment: 0,
        balance: c.loan_balance ?? 0,
        dueDate: c.due_date ?? "",
        arrears: c.arrears,
      }));

      setFilteredData(formatted);
      setTableData(formatted);

      const c = customers[0];

      setCustomerInfo({
        cname: c.cname,
        loanId: c.loan_code,
        outstandingBalance: c.loan_amount ?? 0,
      });

      setCustomerFound(true);
    } catch (err) {
      setSearchError("Error searching customer");
      setCustomerFound(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePaymentChange = (index: number, value: number) => {
    const newData = [...filteredData];
    newData[index].payment = value;

    setFilteredData(newData);

    const mainIndex = tableData.findIndex(
      (row) => row.loanCode === newData[index].loanCode,
    );

    if (mainIndex !== -1) {
      const mainData = [...tableData];
      mainData[mainIndex].payment = value;
      setTableData(mainData);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check float first
    if (!canSubmitLoan) {
      setErrorMessage("Cannot submit payment: Float not submitted for today.");
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }

    if (!paymentAmount || !selectedPaymentMethod) {
      setErrorMessage("Please enter amount and select payment method.");
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
    if (selectedPaymentMethod === "death") {
      const {
        marriage_certificate,
        bank_passbook,
        death_certificate,
        donation_request_letter,
      } = deathFiles;
      if (
        !marriage_certificate ||
        !bank_passbook ||
        !death_certificate ||
        !donation_request_letter
      ) {
        setErrorMessage(
          "Please attach all required death settlement documents.",
        );
        return;
      }
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    if (selectedPaymentMethod === "death") {
      const fd = new FormData();
      fd.append("loan_code", customerInfo?.loanId || "");
      fd.append("payment_amount", paymentAmount);
      fd.append("method", "death");
      fd.append("name", user?.name || "");
      if (deathFiles.marriage_certificate)
        fd.append("marriage_certificate", deathFiles.marriage_certificate);
      if (deathFiles.bank_passbook)
        fd.append("bank_passbook", deathFiles.bank_passbook);
      if (deathFiles.death_certificate)
        fd.append("death_certificate", deathFiles.death_certificate);
      if (deathFiles.donation_request_letter)
        fd.append(
          "donation_request_letter",
          deathFiles.donation_request_letter,
        );
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/death`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage("Death settlement recorded successfully.");
          setTimeout(() => {
            setSuccessMessage("");
            handleClear();
          }, 2000);
        } else {
          setErrorMessage(data.error || "Failed to record death settlement.");
          setTimeout(() => setErrorMessage(""), 2000);
        }
      } catch {
        setErrorMessage("An unexpected error occurred.");
      }
      return;
    }
    const isCashMethod = selectedPaymentMethod === "cash";

    if (isCashMethod) {
      const payload = {
        loanCode: customerInfo?.loanId,
        customerCode: filteredData[0]?.customerCode,
        cname: customerInfo?.cname,
        name: user?.name || "",
        payment: Number(paymentAmount),
        method: selectedPaymentMethod,
        cdkNumber,
      };
      try {
        const success = await submitPayment(payload);
        if (success) {
          setSuccessMessage("Payment recorded successfully.");
          setTimeout(() => {
            setSuccessMessage("");
            handleClear();
          }, 2000);
        } else {
          setErrorMessage("Failed to record payment.");
          setTimeout(() => setErrorMessage(""), 2000);
        }
      } catch {
        setErrorMessage("An unexpected error occurred.");
      }
    } else {
      const fd = new FormData();
      fd.append("loan_code", customerInfo?.loanId || "");
      fd.append("payment_amount", paymentAmount);
      fd.append("method", selectedPaymentMethod);
      fd.append("cdk_number", cdkNumber || "");
      fd.append("name", user?.name || "");
      if (slipFile) fd.append("slip", slipFile);
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/deposit`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage("Payment recorded successfully.");
          setTimeout(() => {
            setSuccessMessage("");
            handleClear();
          }, 2000);
        } else {
          setErrorMessage(data.error || "Failed to record payment.");
          setTimeout(() => setErrorMessage(""), 2000);
        }
      } catch {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setCustomerFound(false);
    setCustomerInfo(null);
    setFilteredData([]);
    setTableData([]);
    setSelectedPaymentMethod("");
    setPaymentAmount("");
    setSearchError("");
    setDeathFiles({
      marriage_certificate: null,
      bank_passbook: null,
      death_certificate: null,
      donation_request_letter: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Single Payment
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Process individual customer payments
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
              Search Customer
            </Label>

            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                <Input
                  placeholder="Search by NIC, Customer Code, or Loan Code..."
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

        {/* TABLE */}

        {customerFound && (
          <div className="mb-6">
            <PaymentsTable
              type="single"
              data={filteredData}
              onPaymentChange={handlePaymentChange}
            />
          </div>
        )}

        {/* PAYMENT FORM */}

        {customerFound && (
          <Card
            className={`mb-6 border-0 shadow-lg ${
              selectedPaymentMethod === "death"
                ? "bg-red-50 border-red-200"
                : ""
            }`}
          >
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
                        <SelectItem value="death">Death</SelectItem>
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
                      required
                    />
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
                    />
                  </div>
                )}
                {(selectedPaymentMethod === "CDK" ||
                  selectedPaymentMethod === "Online Payment" ||
                  selectedPaymentMethod === "Bank Deposit") && (
                  <div>
                    <Label className="font-semibold">Attach Slip</Label>
                    <FileUploadField
                      id="slip-upload"
                      label="Payment Slip"
                      required
                      onFile={(f) => setSlipFile(f)}
                    />
                  </div>
                )}
                {/* DEATH SETTLEMENT DOCUMENTS */}
                {selectedPaymentMethod === "death" && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
                    <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Death Settlement Documents
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FileUploadField
                        id="death-marriage-cert"
                        label="Marriage Certificate"
                        required
                        onFile={(f) =>
                          setDeathFiles((prev) => ({
                            ...prev,
                            marriage_certificate: f,
                          }))
                        }
                      />
                      <FileUploadField
                        id="death-bank-passbook"
                        label="Bank Passbook"
                        required
                        onFile={(f) =>
                          setDeathFiles((prev) => ({
                            ...prev,
                            bank_passbook: f,
                          }))
                        }
                      />
                      <FileUploadField
                        id="death-certificate"
                        label="Death Certificate"
                        required
                        onFile={(f) =>
                          setDeathFiles((prev) => ({
                            ...prev,
                            death_certificate: f,
                          }))
                        }
                      />
                      <FileUploadField
                        id="death-donation-letter"
                        label="Donation Request Letter"
                        required
                        onFile={(f) =>
                          setDeathFiles((prev) => ({
                            ...prev,
                            donation_request_letter: f,
                          }))
                        }
                      />
                    </div>
                  </div>
                )}
                <Separator />

                <div className="flex justify-end gap-4 pt-4">
                  <Button variant="outline" type="button" onClick={handleClear}>
                    Clear
                  </Button>

                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={!canSubmitLoan || checkingFloat}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Payment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TOTAL */}

        {customerFound && filteredData.length > 0 && (
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 flex justify-between">
              <span className="text-sm font-medium text-gray-600">
                Total Payments
              </span>

              <span className="text-xl font-bold text-primary">
                Rs. {totalPayments.toFixed(2)}
              </span>
            </CardContent>
          </Card>
        )}
      </div>

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
                  {customerInfo?.cname}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loan Code</span>
                <span className="font-mono text-xs text-gray-700">
                  {customerInfo?.loanId}
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
                <span className="font-bold text-lg text-primary">
                  Rs.{" "}
                  {Number(paymentAmount).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
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
              className="bg-primary gap-2"
              onClick={handleConfirmSubmit}
              disabled={!canSubmitLoan}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SinglePayment;
