import { type FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { API } from "@/apiConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OrderStatus =
  | "pending"
  | "approved"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type Order = {
  id: number;
  order_code: string;
  product_id: string;
  customer_nic: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  quantity: number;
  total_amount: string | number;
  order_status: OrderStatus;
  created_at: string;
  updated_at: string;
  courier_charge?: string | number;
};

const STEPS: { value: Exclude<OrderStatus, "cancelled">; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-violet-100 text-violet-800 border-violet-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const toNumber = (value: string | number | undefined) =>
  typeof value === "number" ? value : Number(value || 0);

const formatMoney = (value: number) =>
  `Rs. ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ProductTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id || localStorage.getItem("userId") || "";
  const userRole = user?.status || user?.role || "";

  const loadOrders = async (query = search) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      params.set("userid", String(userId));
      params.set("role", userRole);
      if (query.trim()) params.set("search", query.trim());
      const response = await fetch(`${API.orders.getOrderStatus}?${params}`);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Failed to load order statuses");
      }
      const rows = data.data?.orders || data.data || data.orders || [];
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setOrders([]);
      setError(
        err instanceof Error ? err.message : "Failed to load order statuses",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders("");
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchInput);
    loadOrders(searchInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">
              Product Tracking
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Search orders by order code, loan, product, or customer details.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => loadOrders()}
          title="Refresh orders"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Order code, loan code, product ID, NIC, name, phone, or address"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          Search orders
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button
            className="ml-auto font-medium hover:underline"
            onClick={() => loadOrders()}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-medium text-gray-700">No orders found</p>
          <p className="mt-1 text-sm text-gray-500">
            Try a different search term.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const currentIndex = STEPS.findIndex(
              (step) => step.value === order.order_status,
            );
            const isCancelled = order.order_status === "cancelled";
            return (
              <Card
                key={order.id || order.order_code}
                className="overflow-hidden bg-white"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        {order.order_code}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {order.customer_name} ·{" "}
                        {order.customer_phone || "No phone"}
                      </p>
                    </div>
                    <Badge
                      className={
                        statusColors[order.order_status] || statusColors.pending
                      }
                    >
                      {order.order_status}
                    </Badge>
                  </div>

                  {isCancelled ? (
                    <div className="mt-5 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">
                        This order has been cancelled.
                      </span>
                    </div>
                  ) : (
                    <div className="mt-6 flex items-start">
                      {STEPS.map((step, index) => {
                        const complete = index <= currentIndex;
                        return (
                          <div
                            key={step.value}
                            className="flex min-w-0 flex-1 items-start"
                          >
                            <div className="flex min-w-0 flex-1 flex-col items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${complete ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-400"}`}
                              >
                                {complete ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <span className="text-xs">{index + 1}</span>
                                )}
                              </div>
                              <span
                                className={`mt-2 text-center text-[11px] sm:text-xs ${complete ? "font-semibold text-gray-900" : "text-gray-400"}`}
                              >
                                {step.label}
                              </span>
                            </div>
                            {index < STEPS.length - 1 && (
                              <div
                                className={`mt-4 h-0.5 flex-1 ${index < currentIndex ? "bg-primary" : "bg-gray-200"}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <span className="text-gray-500">Product</span>
                      <p className="font-medium">
                        {order.product_id} · Qty {order.quantity}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Customer NIC</span>
                      <p className="font-medium">{order.customer_nic}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total</span>
                      <p className="font-medium">
                        {formatMoney(
                          toNumber(order.total_amount) +
                            toNumber(order.courier_charge),
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Last updated</span>
                      <p className="font-medium">
                        {new Date(
                          order.updated_at || order.created_at,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                    {order.order_status === "shipped" ? (
                      <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {order.customer_address ||
                        "Delivery address not available"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductTracking;
