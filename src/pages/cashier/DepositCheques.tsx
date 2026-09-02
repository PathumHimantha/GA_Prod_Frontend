import { useState, useEffect, useCallback } from "react";
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
import {
  Search,
  Check,
  RotateCcw,
  X,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  Download,
  CreditCard,
  Banknote,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  get__deposit_cheques,
  submitChequeDeposit,
  getChequeDeposits,
} from "@/lib/paymentsHelper";
import { API_BASE_URL } from "@/apiConfig";
interface ActionModal {
  type: "confirm" | "return";
  cheque: ChequeDeposit;
}
interface ChequeDeposit {
  id: number;
  customer_name: string;
  customer_code: string;
  loan_code: string;
  cheque_number: string;
  cheque_date: string;
  cheque_amount: number;
  branch_name: string;
  status: "pending" | "approved" | "confirmed" | "returned";
  submitted_by: string;
  created_at: string;
  confirmed_by?: string;
  returned_by?: string;
}

interface Metrics {
  total: number;
  pending: number;
  approved: number;
  confirmed: number;
  returned: number;
  total_amount: number;
}

const DepositCheques = () => {
  const { user } = useAuth();
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toISOString().split("T")[0];
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [returnCharge, setReturnCharge] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  // Search
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Table
  const [deposits, setDeposits] = useState<ChequeDeposit[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    pending: 0,
    approved: 0,
    confirmed: 0,
    returned: 0,
    total_amount: 0,
  });
  const [loadingTable, setLoadingTable] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form
  const [newCheque, setNewCheque] = useState({
    chequeNo: "",
    amount: "",
    chequeDate: dateStr,
  });

  // Alerts
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ── Load deposits ─────────────────────────────────
  const loadDeposits = useCallback(async () => {
    setLoadingTable(true);
    try {
      const data = await getChequeDeposits({
        branch_code: user?.bcode || undefined,
        submitted_by: user?.name || undefined,
        role: user?.status || undefined,
        userid: user?.id?.toString() || undefined,
        bname: user?.bname || undefined,
      });
      setDeposits(data.records || []);
      setMetrics(data.metrics || {});
    } catch {
      // silent
    } finally {
      setLoadingTable(false);
    }
  }, [user]);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  // ── Customer search ───────────────────────────────
  const handleCustomerSearch = async () => {
    if (!customerSearchQuery.trim()) {
      setSearchError("Please enter Customer Code, Loan Code, or NIC");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    try {
      const customer = await get__deposit_cheques(
        customerSearchQuery,
        user?.bcode || "",
      );

      setCustomerInfo(customer);
      setShowAddForm(true);
    } catch (err: any) {
      setSearchError(err.message || "No customer found");
      setCustomerInfo(null);
      setShowAddForm(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setCustomerSearchQuery("");
    setCustomerInfo(null);
    setShowAddForm(false);
    setSearchError("");
    setNewCheque({ chequeNo: "", amount: "", chequeDate: dateStr });
  };
  console.log("Customer search result:", customerInfo);
  // ── Submit deposit ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitChequeDeposit({
      customer_code: customerInfo.customer.customer_code,
      loan_code: customerInfo.customer.loan_code,
      nic: customerInfo.customer.nic,
      customer_name: customerInfo.customer.name,
      branch_name: customerInfo.customer.bname,
      branch_code: customerInfo.customer.bcode,
      center: customerInfo.customer.center,
      cheque_number: newCheque.chequeNo,
      cheque_date: newCheque.chequeDate,
      cheque_amount: parseFloat(newCheque.amount),
      submitted_by: user?.name || "",
    });

    if (result.success) {
      setSuccessMessage(
        "Cheque deposit submitted successfully! Awaiting admin confirmation.",
      );
      setTimeout(() => setSuccessMessage(""), 3000);
      handleClearSearch();
      await loadDeposits();
    } else {
      setErrorMessage(result.error || "Failed to submit");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  const handleConfirmCheque = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/confirm_cheque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cheque_id: actionModal.cheque.id,
          confirmed_by: user?.name,
          confirmed_by_id: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm");
      setSuccessMessage("Cheque confirmed and payment recorded successfully.");
      setTimeout(() => setSuccessMessage(""), 4000);
      setActionModal(null);
      await loadDeposits();
    } catch (err: any) {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnCheque = async () => {
    if (!actionModal || !returnReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/return_cheque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cheque_id: actionModal.cheque.id,
          returned_by: user?.name,
          returned_by_id: user?.id,
          return_charge: parseFloat(returnCharge) || 0,
          return_reason: returnReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to return");
      setSuccessMessage("Cheque marked as returned successfully.");
      setTimeout(() => setSuccessMessage(""), 4000);
      setActionModal(null);
      setReturnCharge("");
      setReturnReason("");
      await loadDeposits();
    } catch (err: any) {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setActionLoading(false);
    }
  };
  // ── Filter deposits ───────────────────────────────
  const filteredDeposits = deposits
    .filter((d) => filterStatus === "all" || d.status === filterStatus)
    .filter(
      (d) =>
        !searchQuery ||
        d.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customer_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.cheque_number?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      approved: "bg-blue-100 text-blue-700 border-blue-200",
      confirmed: "bg-green-100 text-green-700 border-green-200",
      returned: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <Badge
        className={`border ${map[status] || "bg-slate-100 text-slate-600"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Cheque Deposits
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track customer cheque deposits
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

        {/* ALERTS */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            {
              label: "Total",
              value: metrics.total,
              color: "primary",
              icon: <CreditCard className="w-5 h-5 text-primary" />,
            },
            {
              label: "Pending",
              value: metrics.pending,
              color: "amber",
              icon: <Clock className="w-5 h-5 text-amber-600" />,
            },
            {
              label: "Approved",
              value: metrics.approved,
              color: "blue",
              icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
            },
            {
              label: "Confirmed",
              value: metrics.confirmed,
              color: "green",
              icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
            },
            {
              label: "Returned",
              value: metrics.returned,
              color: "red",
              icon: <XCircle className="w-5 h-5 text-red-600" />,
            },
          ].map((m) => (
            <Card key={m.label} className="border-0 shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-${m.color}-500/10 flex items-center justify-center shrink-0`}
                >
                  {m.icon}
                </div>
                <div>
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-xl font-bold text-gray-800">{m.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-0 shadow-md col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-sm font-bold text-primary">
                  Rs.{" "}
                  {metrics.total_amount?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH CUSTOMER */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <Label className="text-sm font-semibold text-gray-700">
              Search Customer
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Enter Customer Code, Loan Code, or NIC"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomerSearch()}
                  className="pl-9 h-12 bg-white border-gray-200"
                />
              </div>
              <Button
                onClick={handleCustomerSearch}
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
              {customerInfo && (
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  className="h-12 px-6 gap-2"
                >
                  <XCircle className="w-4 h-4" /> Clear
                </Button>
              )}
            </div>
            {searchError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{searchError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ADD FORM */}
        {showAddForm && customerInfo && (
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Add New Cheque Deposit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-primary/5 rounded-lg">
                  {[
                    {
                      label: "Customer Name",
                      value: customerInfo.customer.cname,
                    },
                    {
                      label: "Customer Code",
                      value: customerInfo.customer.customer_code,
                    },
                    {
                      label: "Loan Code",
                      value: customerInfo.customer.loan_code,
                    },
                    { label: "Center", value: customerInfo.customer.center },
                  ].map((f) => (
                    <div key={f.label}>
                      <Label className="text-xs text-gray-500">{f.label}</Label>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Cheque Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        value={newCheque.chequeNo}
                        onChange={(e) =>
                          setNewCheque({
                            ...newCheque,
                            chequeNo: e.target.value,
                          })
                        }
                        placeholder="Enter cheque number"
                        className="pl-9 h-12"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Amount (Rs.) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="number"
                        value={newCheque.amount}
                        onChange={(e) =>
                          setNewCheque({ ...newCheque, amount: e.target.value })
                        }
                        placeholder="0.00"
                        className="pl-9 h-12"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Cheque Date <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="date"
                        value={newCheque.chequeDate}
                        onChange={(e) =>
                          setNewCheque({
                            ...newCheque,
                            chequeDate: e.target.value,
                          })
                        }
                        className="pl-9 h-12"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleClearSearch}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="px-8 gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Banknote className="w-4 h-4" />
                    Submit Cheque Deposit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* DEPOSITS TABLE */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                Cheque Deposits
                {loadingTable && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    Loading...
                  </span>
                )}
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 w-full sm:w-56 bg-white border-gray-200"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40 h-10 bg-white border-gray-200">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <SelectValue placeholder="All Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredDeposits.length > 0 ? (
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  <div className="w-full overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          {[
                            "ID",
                            "Customer",
                            "Loan Code",
                            "Cheque No",
                            "Date",
                            "Amount",
                            "Status",
                            "Submitted By",
                          ].map((h) => (
                            <TableHead
                              key={h}
                              className="font-semibold text-gray-600"
                            >
                              {h}
                            </TableHead>
                          ))}
                          {user?.status === "admin" && (
                            <TableHead className="font-semibold text-gray-600">
                              Actions
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeposits.map((d) => (
                          <TableRow key={d.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm font-medium">
                              #{d.id}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-gray-900">
                                {d.customer_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {d.customer_code}
                              </p>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-gray-600">
                              {d.loan_code}
                            </TableCell>
                            <TableCell className="text-sm font-mono text-gray-700">
                              {d.cheque_number}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {d.cheque_date?.toString().slice(0, 10)}
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-primary text-right">
                              Rs.{" "}
                              {parseFloat(
                                String(d.cheque_amount),
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(d.status)}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {d.submitted_by}
                            </TableCell>

                            {/* ── Admin action column ── */}
                            {user?.status === "admin" && (
                              <TableCell>
                                {d.status === "pending" ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        setActionModal({
                                          type: "confirm",
                                          cheque: d,
                                        })
                                      }
                                      className="h-8 px-3 gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setActionModal({
                                          type: "return",
                                          cheque: d,
                                        });
                                        setReturnCharge("");
                                        setReturnReason("");
                                      }}
                                      className="h-8 px-3 gap-1.5 text-xs border-red-300 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />{" "}
                                      Return
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    {d.status === "confirmed"
                                      ? `By ${d.confirmed_by || "—"}`
                                      : d.status === "returned"
                                        ? `By ${d.returned_by || "—"}`
                                        : "—"}
                                  </span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Mobile */}
                <div className="block md:hidden p-4 space-y-3">
                  {filteredDeposits.map((d) => (
                    <Card key={d.id} className="border border-gray-200">
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900">
                              {d.customer_name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {d.customer_code}
                            </p>
                          </div>
                          {getStatusBadge(d.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                          <div>
                            <p className="text-gray-500">Cheque No</p>
                            <p className="font-mono">{d.cheque_number}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Date</p>
                            <p>{d.cheque_date?.toString().slice(0, 10)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-500 text-xs">Amount</span>
                          <span className="font-bold text-primary">
                            Rs.{" "}
                            {parseFloat(String(d.cheque_amount)).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2 },
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 border-t pt-2">
                          By: {d.submitted_by}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {filteredDeposits.length} record
                    {filteredDeposits.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    Total: Rs.{" "}
                    {filteredDeposits
                      .reduce(
                        (s, d) => s + parseFloat(String(d.cheque_amount || 0)),
                        0,
                      )
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700">
                  No cheque deposits found
                </h3>
                <p className="text-sm text-gray-500">
                  Search for a customer above to add a new deposit.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {actionModal?.type === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setActionModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/70 font-medium">
                    Admin Action
                  </p>
                  <p className="text-base font-bold text-white">
                    Confirm Cheque Deposit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Confirming this cheque will update the customer loan balance and
                record the payment.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Customer",
                    value: actionModal.cheque.customer_name,
                  },
                  {
                    label: "Customer Code",
                    value: actionModal.cheque.customer_code,
                  },
                  {
                    label: "Cheque No",
                    value: actionModal.cheque.cheque_number,
                  },
                  {
                    label: "Cheque Date",
                    value: actionModal.cheque.cheque_date
                      ?.toString()
                      .slice(0, 10),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
                  Cheque Amount
                </p>
                <p className="text-2xl font-bold text-green-700">
                  Rs.{" "}
                  {parseFloat(
                    String(actionModal.cheque.cheque_amount),
                  ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setActionModal(null)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCheque}
                  disabled={actionLoading}
                  className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionModal?.type === "return" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setActionModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/70 font-medium">
                    Admin Action
                  </p>
                  <p className="text-base font-bold text-white">
                    Return Cheque
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Customer",
                    value: actionModal.cheque.customer_name,
                  },
                  {
                    label: "Cheque No",
                    value: actionModal.cheque.cheque_number,
                  },
                  {
                    label: "Amount",
                    value: `Rs. ${parseFloat(String(actionModal.cheque.cheque_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  },
                  {
                    label: "Submitted By",
                    value: actionModal.cheque.submitted_by,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Return charge */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Return Charge (Rs.){" "}
                  <span className="text-xs text-gray-400 font-normal">
                    — Optional
                  </span>
                </Label>
                <Input
                  type="number"
                  value={returnCharge}
                  onChange={(e) => setReturnCharge(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="h-11 rounded-xl border-gray-200"
                />
                <p className="text-xs text-gray-400">
                  This amount will be added to the customer's loan balance.
                </p>
              </div>

              {/* Return reason */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Return Reason <span className="text-red-500">*</span>
                </Label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter reason for returning this cheque..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setActionModal(null)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReturnCheque}
                  disabled={actionLoading || !returnReason.trim()}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 gap-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Process Return
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositCheques;
