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
  updated_at: string;
  courier_charge?: string | number;
  purchase_agreement?: string; // ✅ Add this field
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
      alert(`✅ Order status updated to ${newStatus}`);
    } catch (err: any) {
      console.error("Error updating order status:", err);
      alert(err.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Print order details
  const printOrder = (order: Order) => {
    const price = getNumericValue(order.price);
    const totalAmount = getNumericValue(order.total_amount);
    const weekPayment = getNumericValue(order.week_payment);

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Please allow popups to print");
      return;
    }

    const statusColors = {
      pending: "#f59e0b",
      approved: "#3b82f6",
      processing: "#8b5cf6",
      shipped: "#06b6d4",
      delivered: "#22c55e",
      cancelled: "#ef4444",
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Details - ${order.order_code}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #f97316; margin: 0; font-size: 28px; }
            .header p { color: #6b7280; margin: 5px 0 0; }
            .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .order-info .label { color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .order-info .value { font-size: 16px; font-weight: 500; margin-top: 4px; }
            .customer-section { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .customer-section h3 { margin: 0 0 15px; color: #374151; font-size: 18px; }
            .customer-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .customer-details .label { color: #6b7280; font-size: 12px; }
            .customer-details .value { font-size: 14px; font-weight: 500; }
            .product-details { background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px; }
            .product-details table { width: 100%; border-collapse: collapse; }
            .product-details th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
            .product-details td { padding: 12px; border-top: 1px solid #e5e7eb; }
            .summary { background: #fef3c7; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; }
            .summary .label { color: #6b7280; font-size: 14px; }
            .summary .amount { font-size: 24px; font-weight: bold; color: #f97316; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: ${statusColors[order.order_status as keyof typeof statusColors] || "#6b7280"}; color: white; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 Order Details</h1>
            <p>Order Code: ${order.order_code}</p>
          </div>

          <div class="order-info">
            <div>
              <div class="label">Order Status</div>
              <div class="value"><span class="status-badge">${order.order_status.toUpperCase()}</span></div>
            </div>
            <div>
              <div class="label">Date Created</div>
              <div class="value">${new Date(order.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div class="label">Loan Code</div>
              <div class="value">${order.loan_code}</div>
            </div>
            <div>
              <div class="label">Product ID</div>
              <div class="value">${order.product_id}</div>
            </div>
          </div>

          <div class="customer-section">
            <h3>👤 Customer Information</h3>
            <div class="customer-details">
              <div>
                <div class="label">Name</div>
                <div class="value">${order.customer_name}</div>
              </div>
              <div>
                <div class="label">NIC</div>
                <div class="value">${order.customer_nic}</div>
              </div>
              <div>
                <div class="label">Phone</div>
                <div class="value">${order.customer_phone || "—"}</div>
              </div>
              <div style="grid-column: span 2;">
                <div class="label">Address</div>
                <div class="value">${order.customer_address || "—"}</div>
              </div>
            </div>
          </div>

          <div class="product-details">
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${order.product_id}</td>
                  <td>${order.quantity}</td>
                  <td>Rs. ${price.toFixed(2)}</td>
                  <td>Rs. ${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="summary">
            <div>
              <div class="label">Period (Weeks)</div>
              <div style="font-size: 18px; font-weight: bold;">${order.period_weeks}</div>
            </div>
            <div>
              <div class="label">Week Payment</div>
              <div style="font-size: 18px; font-weight: bold; color: #22c55e;">Rs. ${weekPayment.toFixed(2)}</div>
            </div>
            <div>
              <div class="label">Total Amount</div>
              <div class="amount">Rs. ${totalAmount.toFixed(2)}</div>
            </div>
          </div>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>© ${new Date().getFullYear()} Golden Asia - All Rights Reserved</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 30px; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              🖨️ Print
            </button>
            <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-left: 10px;">
              Close
            </button>
          </div>
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
      color: "bg-yellow-100 text-yellow-800",
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
    return option ? option.color : "bg-gray-100 text-gray-800";
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
      key: "customer_name",
      header: "Customer",
      render: (_v, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name}</div>
          <div className="text-xs text-gray-500">{row.customer_nic}</div>
        </div>
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
      key: "week_payment",
      header: "Week Payment",
      render: (v, row) => {
        const weekPayment = getNumericValue(row.week_payment);
        return (
          <div className="text-sm text-green-600 font-medium">
            Rs. {weekPayment.toFixed(2)}
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
                      <p className="text-xs text-gray-500">Week Payment</p>
                      <p className="font-medium text-green-600">
                        Rs.{" "}
                        {getNumericValue(selectedOrder.week_payment).toFixed(2)}
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
                              `${API_BASE_URL}${selectedOrder.purchase_agreement}`,
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
                            link.href = `${API_BASE_URL}${selectedOrder.purchase_agreement}`;
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
                          src={`${API_BASE_URL}${selectedOrder.purchase_agreement}`}
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
    </div>
  );
};

export default ManageOrders;
