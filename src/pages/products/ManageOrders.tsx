import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import StatusBadge from "@/components/ui/StatusBadge";
import DynamicTable, { ColumnDef } from "@/components/DynamicTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertCircle,
  Printer,
  XCircle,
  Clock,
  User,
  RefreshCw,
  Eye,
  FileText,
  Download,
  Pencil,
  CheckCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Order = {
  id: number;
  order_code: string;
  loan_code: string;
  product_id: string;
  customer_nic: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  quantity: number;
  price: string | number;
  total_amount: string | number;
  week_payment: string | number;
  period_weeks: number;
  order_status:
    | "pending"
    | "approved"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  status: "active" | "inactive";
  created_by: string;
  created_at: string;
  ex_contact?: string; // Optional field for external contact
  updated_at: string;
  courier_charge?: string | number;
  purchase_agreement?: string; // ✅ Add this field
  purchase_agreement_back?: string;
  courier_slip?: string | null; // ✅ new
  courier_tracking_no?: string | null; // ✅ new
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

const ManageOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  // ✅ Courier edit state
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [courierOrder, setCourierOrder] = useState<Order | null>(null);
  const [courierTrackingNo, setCourierTrackingNo] = useState("");
  const [courierSlipFile, setCourierSlipFile] = useState<File | null>(null);
  const [savingCourier, setSavingCourier] = useState(false);

  // ✅ Success / Error message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const flashError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const { hasRole } = useAuth();
  if (!hasRole("admin")) {
    return (
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold">Access Denied</h3>
        <p className="text-sm text-gray-600">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  // Helper function to get numeric value
  const getNumericValue = (value: string | number): number => {
    return typeof value === "string" ? parseFloat(value) : value;
  };

  // Load orders
  const loadOrders = async (page = 1, search = "", status = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (status && status !== "all") params.append("order_status", status);

      const response = await fetch(
        `${API_BASE_URL}/loans/orders_to_manage?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();

      if (data.success) {
        // Convert string numbers to actual numbers
        const processedOrders = data.data.map((order: any) => ({
          ...order,
          price:
            typeof order.price === "string"
              ? parseFloat(order.price)
              : order.price,
          total_amount:
            typeof order.total_amount === "string"
              ? parseFloat(order.total_amount)
              : order.total_amount,
          week_payment:
            typeof order.week_payment === "string"
              ? parseFloat(order.week_payment)
              : order.week_payment,
          purchase_agreement: order.purchase_agreement || null, // ✅ Include purchase_agreement
        }));
        setOrders(processedOrders || []);
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
          },
        );
      } else {
        throw new Error(data.error || "Failed to fetch orders");
      }
    } catch (err: any) {
      console.error("Error loading orders:", err);
      setError(err.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(currentPage, searchTerm, statusFilter);
  }, [currentPage, searchTerm, statusFilter]);

  // Update order status
  const updateOrderStatus = async (orderCode: string, newStatus: string) => {
    setUpdatingStatus(orderCode);
    try {
      const response = await fetch(
        `${API_BASE_URL}/loans/orders/${orderCode}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ order_status: newStatus }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update order status");
      }

      await loadOrders(currentPage, searchTerm, statusFilter);
      flashSuccess(`✅ Order status updated to ${newStatus}`);
    } catch (err: any) {
      console.error("Error updating order status:", err);
      alert(err.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(null);
    }
  };
  // ✅ Save courier slip + tracking number
  const saveCourierInfo = async () => {
    if (!courierOrder) return;

    setSavingCourier(true);
    try {
      const formData = new FormData();
      formData.append("courier_tracking_no", courierTrackingNo || "");
      if (courierSlipFile) {
        formData.append("courier_slip", courierSlipFile);
      }

      const response = await fetch(
        `${API_BASE_URL}/loans/orders/${courierOrder.order_code}/courier`,
        {
          method: "PUT",
          body: formData,
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save courier info");
      }

      // Update the local orders list with the new values
      setOrders((prev) =>
        prev.map((o) =>
          o.order_code === courierOrder.order_code
            ? {
                ...o,
                courier_slip: data.data.courier_slip,
                courier_tracking_no: data.data.courier_tracking_no,
              }
            : o,
        ),
      );

      setShowCourierModal(false);
      setCourierOrder(null);
      setCourierSlipFile(null);
      setCourierTrackingNo("");

      // Refresh to keep in sync
      await loadOrders(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      console.error("Error saving courier info:", err);
      alert(err.message || "Failed to save courier info");
    } finally {
      setSavingCourier(false);
    }
  };

  // ✅ Open the courier modal pre-filled
  const openCourierModal = (order: Order) => {
    setCourierOrder(order);
    setCourierTrackingNo(order.courier_tracking_no || "");
    setCourierSlipFile(null);
    setShowCourierModal(true);
  };
  // Print order details — half-page A4 From/To label
  const printOrder = (order: Order) => {
    const printWindow = window.open("", "_blank", "width=900,height=600");
    if (!printWindow) {
      alert("Please allow popups to print");
      return;
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Order Label - ${order.order_code}</title>
       <style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
  }
  .label {
  margin-top: 8px;
    width: 210mm;
    height: 148.5mm; /* exactly half of A4 (297/2) */
    padding: 15mm 20mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 2px solid #111;
  }
  .label-header {
    text-align: center;
    border-bottom: 1px dashed #999;
    padding-bottom: 6mm;
  }
  .label-header h1 {
    margin: 0;
    font-size: 22pt;          /* ← was 16pt */
    letter-spacing: 0.5px;
    font-weight: 800;
  }
  .label-header p {
    margin: 2mm 0 0;
    font-size: 12pt;          /* ← was 9pt */
    color: #333;
    font-family: monospace;
    font-weight: 600;
  }
  .addresses {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12mm;
    padding: 10mm 0;
    flex: 1;
  }
  .address-block {
    display: flex;
    flex-direction: column;
  }
  .address-block .tag {
    font-size: 12pt;          /* ← was 8pt */
    font-weight: 800;
    letter-spacing: 2px;
    color: #333;
    text-transform: uppercase;
    margin-bottom: 3mm;
  }
  .address-block .name {
    font-size: 17pt;          /* ← was 13pt */
    font-weight: bold;
    margin-bottom: 3mm;
    line-height: 1.3;
  }
  .address-block .line {
    font-size: 13.5pt;        /* ← was 10.5pt */
    line-height: 1.5;
    margin-bottom: 1.5mm;
  }
  .address-block .phone {
    font-size: 15pt;          /* ← was 11pt */
    font-weight: bold;
    margin-top: 3mm;
  }
  .label-footer {
    border-top: 1px dashed #999;
    padding-top: 5mm;
    text-align: center;
    font-size: 20pt;          /* ← was 8pt */
    color: #fd0101;
    font-weight: 600;
  }
  @media print {
    .label {
      border: none;
      padding: 12mm 18mm;
    }
  }
</style>
      </head>
      <body>
          <div class="label">
          <div class="label-header">
            <h1>GOLDEN ASIA INVESTMENT (PVT) LTD</h1>
            <p>Order: ${order.order_code}</p>
          </div>

 <div class="addresses">
            <!-- FROM -->
            <div class="address-block">
              <div class="tag">From</div>
              <div class="name">Golden Asia Investment (Pvt) Ltd</div>
              <div class="line">Kandy Road, Annasigala</div>
              <div class="line">Molagoda, Kegalle</div>
              <div class="phone">Tel:${order.ex_contact || "—"}</div>
              <div class="phone"> 0706624675</div>
       
            </div>

            <!-- TO -->
            <div class="address-block">
              <div class="tag">To</div>
              <div class="name">${order.customer_name || "—"}</div>
              <div class="line">${order.customer_address || "—"}</div>
              <div class="phone">Tel: ${order.customer_phone || "—"}</div>
        
            </div>
          </div>

          <div class="label-footer">
            Please handle with care · Thank you
          </div>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  };

  // Status options for dropdown
  const statusOptions = [
    {
      value: "pending",
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800 ",
    },
    {
      value: "approved",
      label: "Approved",
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "processing",
      label: "Processing",
      color: "bg-purple-100 text-purple-800",
    },
    { value: "shipped", label: "Shipped", color: "bg-cyan-100 text-cyan-800" },
    {
      value: "delivered",
      label: "Delivered",
      color: "bg-green-100 text-green-800",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "bg-red-100 text-red-800",
    },
  ];

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find((s) => s.value === status);
    return option ? option.color : "bg-gray-100 text-gray-800 ";
  };

  const columns: ColumnDef<Order>[] = [
    {
      key: "order_code",
      header: "Order Code",
      render: (v) => (
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
          {v}
        </span>
      ),
    },
    {
      key: "courier_tracking_no",
      header: "Tracking No",
      render: (v) => (
        <span className="text-xs font-mono text-gray-700">{v || "—"}</span>
      ),
    },
    {
      key: "courier_slip",
      header: "Courier Slip",
      render: (v) =>
        v ? (
          <a
            href={v}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            View
          </a>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: "customer_phone",
      header: "Phone",
      render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
    },
    {
      key: "product_id",
      header: "Product",
      render: (v) => (
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
          {v}
        </span>
      ),
    },
    {
      key: "loan_code",
      header: "Loan Code",
      render: (v, row) => {
        const loancode = row.loan_code;
        return (
          <div className="text-sm text-green-600 font-medium">{loancode}</div>
        );
      },
    },
    {
      key: "quantity",
      header: "Qty",
      render: (v) => <span className="font-medium text-center">{v}</span>,
    },
    {
      key: "courier_charge",
      header: "Courier",
      render: (v, row) => (
        <div className="text-sm text-gray-600">
          Rs. {getNumericValue(row.courier_charge || 0).toFixed(2)}
        </div>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      render: (v, row) => {
        const total = getNumericValue(row.total_amount);
        const courier = getNumericValue(row.courier_charge || 0);
        return (
          <div className="font-medium text-gray-900">
            Rs. {(total + courier).toFixed(2)}
          </div>
        );
      },
    },

    {
      key: "order_status",
      header: "Status",
      render: (v, row) => {
        const status = String(v || "pending");
        return (
          <Select
            value={status}
            onValueChange={(newStatus) => {
              if (newStatus !== status) {
                updateOrderStatus(row.order_code, newStatus);
              }
            }}
            disabled={updatingStatus === row.order_code}
          >
            <SelectTrigger
              className={`w-32 h-8 ${getStatusBadge(status)} border-0 focus:ring-0`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className={opt.color}>{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (_v, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setSelectedOrder(row);
              setShowDetailsModal(true);
            }}
            title="View Details"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {/* ✅ Edit Courier */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => openCourierModal(row)}
            title="Add/Edit courier slip & tracking"
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => printOrder(row)}
            title="Print Order"
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.order_status === "pending").length;
    const approved = orders.filter((o) => o.order_status === "approved").length;
    const processing = orders.filter(
      (o) => o.order_status === "processing",
    ).length;
    const shipped = orders.filter((o) => o.order_status === "shipped").length;
    const delivered = orders.filter(
      (o) => o.order_status === "delivered",
    ).length;
    const cancelled = orders.filter(
      (o) => o.order_status === "cancelled",
    ).length;
    return {
      total,
      pending,
      approved,
      processing,
      shipped,
      delivered,
      cancelled,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all product orders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadOrders(currentPage, searchTerm, statusFilter)}
            className="border-gray-200 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* ✅ Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 flex-shrink-0"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ✅ Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 flex-shrink-0"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="bg-white border-l-4 border-l-gray-500">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-yellow-500">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Approved</p>
              <p className="text-xl font-bold text-blue-600">
                {stats.approved}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-purple-500">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Processing</p>
              <p className="text-xl font-bold text-purple-600">
                {stats.processing}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-cyan-500">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Shipped</p>
              <p className="text-xl font-bold text-cyan-600">{stats.shipped}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Delivered</p>
              <p className="text-xl font-bold text-green-600">
                {stats.delivered}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => loadOrders(currentPage, searchTerm, statusFilter)}
            className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DynamicTable
          data={orders}
          columns={columns}
          filterKey="order_status"
          filterOptions={statusOptions}
          filterAllLabel="All Status"
          searchKeys={[
            "order_code",
            "customer_name",
            "customer_nic",
            "product_id",
          ]}
          pageSize={10}
          loading={loading}
          emptyMessage={error ? "Failed to load orders" : "No orders found"}
          onSearch={handleSearch}
          onPageChange={handlePageChange}
          totalItems={pagination.totalItems}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDetailsModal(false)}
          />
          <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Order Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedOrder.order_code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printOrder(selectedOrder)}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-orange-500" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">NIC</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer_nic}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer_phone || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer_address || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-orange-500" />
                    Order Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Product ID</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.product_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Week Payment</p>
                      <p className="font-medium text-green-600">
                        Rs.{" "}
                        {getNumericValue(selectedOrder.week_payment).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="font-medium text-gray-900">
                        Rs. {getNumericValue(selectedOrder.price).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="font-bold text-orange-600">
                        Rs.{" "}
                        {getNumericValue(selectedOrder.total_amount).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Period</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.period_weeks} weeks
                      </p>
                    </div>
                  </div>
                </div>

                {/* ✅ Purchase Agreement Section */}
                {selectedOrder.purchase_agreement && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Purchase Agreement
                    </h3>
                    <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
                      <FileText className="w-6 h-6 text-orange-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {selectedOrder.purchase_agreement.split("/").pop()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Click to view or download
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(
                              selectedOrder.purchase_agreement, // ✅ Direct S3 URL
                              "_blank",
                            );
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = selectedOrder.purchase_agreement; // ✅ Direct S3 URL
                            link.download =
                              selectedOrder.purchase_agreement
                                .split("/")
                                .pop() || "agreement";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {/* ✅ Image Preview (if it's an image) */}
                    {selectedOrder.purchase_agreement.match(
                      /\.(jpg|jpeg|png|gif|webp)$/i,
                    ) && (
                      <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200">
                        <img
                          src={selectedOrder.purchase_agreement} // ✅ Direct S3 URL
                          alt="Purchase Agreement"
                          className="max-h-64 w-auto mx-auto rounded-lg object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* ✅ Purchase Agreement — Back Page */}
                {selectedOrder.purchase_agreement_back && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Purchase Agreement – Back Page
                    </h3>
                    <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
                      <FileText className="w-6 h-6 text-orange-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {selectedOrder.purchase_agreement_back
                            .split("/")
                            .pop()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Click to view or download
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              selectedOrder.purchase_agreement_back,
                              "_blank",
                            )
                          }
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = selectedOrder.purchase_agreement_back!;
                            link.download =
                              selectedOrder
                                .purchase_agreement_back!.split("/")
                                .pop() || "agreement_back";
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                    {selectedOrder.purchase_agreement_back.match(
                      /\.(jpg|jpeg|png|gif|webp)$/i,
                    ) && (
                      <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200">
                        <img
                          src={selectedOrder.purchase_agreement_back}
                          alt="Purchase Agreement Back"
                          className="max-h-64 w-auto mx-auto rounded-lg object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Status Update */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Update Status
                  </h3>
                  <div className="flex items-center gap-3">
                    <Select
                      value={selectedOrder.order_status}
                      onValueChange={(newStatus) => {
                        if (newStatus !== selectedOrder.order_status) {
                          updateOrderStatus(
                            selectedOrder.order_code,
                            newStatus,
                          );
                          setShowDetailsModal(false);
                        }
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className={opt.color}>{opt.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge
                      className={getStatusBadge(selectedOrder.order_status)}
                    >
                      Current: {selectedOrder.order_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  <p>
                    Created:{" "}
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                  <p>
                    Updated:{" "}
                    {new Date(selectedOrder.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* ✅ Courier Edit Modal */}
      {showCourierModal && courierOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCourierModal(false)}
          />
          <Card className="relative w-full max-w-md shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500" />
                    Courier Info
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {courierOrder.order_code}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCourierModal(false)}
                  disabled={savingCourier}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Tracking No */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={courierTrackingNo}
                    onChange={(e) => setCourierTrackingNo(e.target.value)}
                    placeholder="Enter courier tracking number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    disabled={savingCourier}
                  />
                </div>

                {/* Courier Slip Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Courier Slip
                  </label>

                  {/* Show existing slip (if any) */}
                  {courierOrder.courier_slip && !courierSlipFile && (
                    <div className="mb-2 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <a
                        href={courierOrder.courier_slip}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline flex-1 truncate"
                      >
                        {courierOrder.courier_slip.split("/").pop()}
                      </a>
                      <a
                        href={courierOrder.courier_slip}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) =>
                      setCourierSlipFile(e.target.files?.[0] || null)
                    }
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                    disabled={savingCourier}
                  />
                  {courierSlipFile && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {courierSlipFile.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, or PDF (optional — leave blank to keep the
                    existing)
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCourierModal(false)}
                    disabled={savingCourier}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={saveCourierInfo}
                    disabled={savingCourier}
                  >
                    {savingCourier ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManageOrders;
