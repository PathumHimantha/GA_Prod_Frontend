import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  TrendingUp,
  Users,
  CheckCircle2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type ProductRequest = {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  price: number;
  requested_by: string;
  requested_by_id: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  notes: string;
  created_at: string;
  updated_at: string;
  quantity: number;
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

const RequestedProducts = () => {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
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
  const [updating, setUpdating] = useState<{ [key: number]: boolean }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { hasRole, user } = useAuth();

  // Check if user has admin access
  const isAdmin = hasRole("admin");

  // Load requests
  const loadRequests = async (page = 1, search = "", status = "") => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);

      const response = await fetch(
        `${API_BASE_URL}/products/requests?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch product requests");
      }
      const data = await response.json();

      if (data.success) {
        setRequests(data.data || []);
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
          },
        );
      } else {
        throw new Error(data.error || "Failed to fetch requests");
      }
    } catch (err: any) {
      console.error("Error loading requests:", err);
      setError(err.message || "Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadRequests(currentPage, searchTerm, statusFilter);
  }, [currentPage, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const fulfilled = requests.filter((r) => r.status === "fulfilled").length;
    return { total, pending, approved, rejected, fulfilled };
  }, [requests]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "fulfilled":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "fulfilled":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  // Update request status
  const updateStatus = async (requestId: number, newStatus: string) => {
    setUpdating((prev) => ({ ...prev, [requestId]: true }));
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/requests/${requestId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
            notes: `Status updated to ${newStatus} by ${user?.name || "Admin"}`,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      // Reload requests
      await loadRequests(currentPage, searchTerm, statusFilter);
      setSuccessMessage(`Request status updated to ${newStatus} successfully!`);

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Error updating request:", err);
      setErrorMessage(err.message || "Failed to update request status");

      // Auto-dismiss error message after 5 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setUpdating((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  // Access denied for non-admin
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold">Access Denied</h3>
        <p className="text-sm text-gray-600">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  // Columns definition
  const columns: ColumnDef<ProductRequest>[] = [
    {
      key: "id",
      header: "#",
      render: (v) => <span className="text-xs text-gray-500">#{v}</span>,
    },
    {
      key: "product_code",
      header: "Product Code",
      render: (v) => (
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
          {v}
        </span>
      ),
    },
    {
      key: "product_name",
      header: "Product",
      render: (_v, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.product_name}</div>
          <div className="text-xs text-gray-500">
            Price: Rs. {Number(row.price).toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      key: "requested_by",
      header: "Requested By",
      render: (v) => <span className="text-sm font-medium">{v}</span>,
    },
    {
      key: "created_at",
      header: "Requested Date",
      render: (v) => {
        const date = new Date(v);
        return (
          <div>
            <div className="text-sm">{date.toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">
              {date.toLocaleTimeString()}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (_v, row) => (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            row.status,
          )}`}
        >
          {getStatusIcon(row.status)}
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (v) => (
        <div className="text-xs text-gray-500 max-w-[200px] truncate">
          {v || "—"}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      render: (v) => <span className="text-sm font-medium">{v}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (_v, row) => {
        if (row.status === "fulfilled" || row.status === "rejected") {
          return (
            <span className="text-xs text-gray-400">No actions available</span>
          );
        }

        return (
          <div className="flex items-center gap-1.5">
            {row.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateStatus(row.id, "approved")}
                  disabled={updating[row.id]}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8 px-3"
                >
                  {updating[row.id] ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus(row.id, "rejected")}
                  disabled={updating[row.id]}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs h-8 px-3"
                >
                  {updating[row.id] ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    "Reject"
                  )}
                </Button>
              </>
            )}
            {row.status === "approved" && (
              <Button
                size="sm"
                onClick={() => updateStatus(row.id, "fulfilled")}
                disabled={updating[row.id]}
                className="bg-green-500 hover:bg-green-600 text-white text-xs h-8 px-3"
              >
                {updating[row.id] ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  "Mark Fulfilled"
                )}
              </Button>
            )}
          </div>
        );
      },
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

  // Clear messages
  const clearMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Requests</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer product requests and update their status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="h-10 bg-white border-gray-200">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => loadRequests(currentPage, searchTerm, statusFilter)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={clearMessages}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => loadRequests(currentPage, searchTerm, statusFilter)}
            className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-500 font-medium">
                  Total
                </Label>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-500 font-medium">
                  Pending
                </Label>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-500 font-medium">
                  Approved
                </Label>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {stats.approved}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-500 font-medium">
                  Fulfilled
                </Label>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.fulfilled}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-500 font-medium">
                  Rejected
                </Label>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats.rejected}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DynamicTable
          data={requests}
          columns={columns}
          searchKeys={["product_name", "product_code", "requested_by"]}
          pageSize={10}
          loading={loading}
          emptyMessage={
            error ? "Failed to load requests" : "No product requests found"
          }
          onSearch={handleSearch}
          onPageChange={handlePageChange}
          totalItems={pagination.totalItems}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      </div>
    </div>
  );
};

export default RequestedProducts;
