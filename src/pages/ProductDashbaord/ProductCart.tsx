import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart,
  Package,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  AlertCircle,
  Loader2,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  X,
  Edit2,
  Save,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ApprovalModal from "./ApprovalModal";

type CartItem = {
  id: number;
  product_id: string;
  customer_nic: string;
  quantity: number;
  price: string;
  total_amount: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  product_name: string;
  category: string;
  images: string[];
  product_price: string;
  product_weight?: string | number;
};

type CustomerDetails = {
  customer: {
    loan_code: string;
    name: string;
    cname: string;
    nic: string;
    address: string;
    phone1: string;
    phone2: string;
    center: string;
    ccode: string;
    bname: string;
    group: string;
    loan_amount: string;
    loan_balance: string;
    loan_date: string;
    due_date: string;
    type: string;
    loan_category: string;
    document_fee: string;
    insurance_fee: string;
    customer_code: string;
    week_payment: string;
    image: string;
  };
  loans: any[];
  payments: any[];
  deathSettlements: any[];
  summary: {
    totalLoanAmount: number;
    totalBalance: number;
    totalPaid: number;
    activeLoans: number;
    completedLoans: number;
  };
};

type CustomerGroup = {
  customer_nic: string;
  customer_details: CustomerDetails | null;
  items: CartItem[];
  total_amount: number;
  total_items: number;
};

const ProductCart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalItems: 0,
    totalAmount: 0,
    requestedItems: 0,
  });
  // ✅ Success/Error Message States
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Approval Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(
    null,
  );
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [periodWeeks, setPeriodWeeks] = useState(13);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Get user ID from auth context
  const userId = user?.id || localStorage.getItem("userId") || "89";

  // Clear messages function
  const clearMessages = () => {
    setSuccessMessage(null);
    setSuccessDetails(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    loadCartItems();
  }, [userId]);

  const loadCartItems = async () => {
    setLoading(true);
    setError(null);
    clearMessages();
    try {
      const response = await fetch(
        `${API_BASE_URL}/cart/user/${encodeURIComponent(userId)}`,
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch cart items");
      }
      const data = await response.json();
      if (data.success) {
        setGroups(data.data.groups || []);
        setSummary(
          data.data.summary || {
            totalCustomers: 0,
            totalItems: 0,
            totalAmount: 0,
            requestedItems: 0,
          },
        );
        if (data.data.groups && data.data.groups.length > 0) {
          const firstNic = data.data.groups[0].customer_nic;
          setExpandedGroups(new Set([firstNic]));
        }
      } else {
        throw new Error(data.error || "Failed to fetch cart items");
      }
    } catch (err: any) {
      console.error("Error loading cart:", err);
      setError(err.message || "Failed to load cart items");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdating(itemId);
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/cart/update/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update quantity");
      }
      setSuccessMessage("Quantity updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadCartItems();
    } catch (err: any) {
      console.error("Error updating quantity:", err);
      setErrorMessage(err.message || "Failed to update quantity");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: number) => {
    // ✅ Find the item and check status
    const item = groups.flatMap((g) => g.items).find((i) => i.id === itemId);

    if (item?.status === "requested") {
      setErrorMessage(
        "Cannot remove this item — it is pending fulfillment. Please wait for the request to be fulfilled.",
      );
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (!confirm("Are you sure you want to remove this item from cart?"))
      return;
    setRemoving(itemId);
    clearMessages();
    try {
      const response = await fetch(`${API_BASE_URL}/cart/remove/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove item");
      }
      setSuccessMessage("Item removed from cart successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadCartItems();
    } catch (err: any) {
      console.error("Error removing item:", err);
      setErrorMessage(err.message || "Failed to remove item");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setRemoving(null);
    }
  };

  const toggleGroup = (nic: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nic)) {
        newSet.delete(nic);
      } else {
        newSet.add(nic);
      }
      return newSet;
    });
  };

  const openApprovalModal = (group: CustomerGroup) => {
    setSelectedGroup(group);
    const customer = group.customer_details?.customer;
    setCustomerAddress(customer?.address || "");
    setCustomerPhone(customer?.phone1 || "");
    setApprovalError(null);
    setIsEditing(false);
    clearMessages();
    setShowApprovalModal(true);
  };

  const getImageUrl = (imagePath: string) => {
    return imagePath || null;
  };

  const formatDate = (date: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  // ✅ Helper: count of requested items in a group
  const getGroupRequestedCount = (group: CustomerGroup) =>
    group.items.filter((item) => item.status === "requested").length;

  // ✅ Helper: is any item in this group still pending fulfillment?
  const isGroupLocked = (group: CustomerGroup) =>
    getGroupRequestedCount(group) > 0;

  // ✅ Helper: recompute summary including requested count (client fallback)
  const computedRequestedCount = groups.reduce(
    (sum, g) => sum + getGroupRequestedCount(g),
    0,
  );

  // Use backend value if present, otherwise fall back to client count
  const requestedItemsCount =
    summary.requestedItems > 0
      ? summary.requestedItems
      : computedRequestedCount;
  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                >
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4"
              >
                <div className="h-12 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        <div className="mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                Product Cart
              </h1>
              <p className="text-sm text-gray-500">
                View and manage all customer cart items
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadCartItems}
                className="border-gray-200 hover:bg-gray-100"
                disabled={loading}
              >
                <Loader2
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="ml-2">Refresh</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-xl flex items-center justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">{successMessage}</span>
                  {successDetails && (
                    <div className="text-sm text-green-700 mt-2 space-y-1">
                      <p>
                        <span className="font-medium">Loan Code:</span>{" "}
                        {successDetails.loanCode}
                      </p>
                      <p>
                        <span className="font-medium">Order Code:</span>{" "}
                        {successDetails.orderCode}
                      </p>
                      <p>
                        <span className="font-medium">Total:</span> Rs.{" "}
                        {successDetails.total}
                      </p>
                      <p>
                        <span className="font-medium">Courier Charge:</span> Rs.{" "}
                        {successDetails.courierCharge}
                      </p>
                      <p>
                        <span className="font-medium">Total with Courier:</span>{" "}
                        Rs. {successDetails.totalWithCourier}
                      </p>
                      <p>
                        <span className="font-medium">Week Payment:</span> Rs.{" "}
                        {successDetails.weekPayment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={clearMessages}
                className="text-green-600 hover:text-green-800 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                onClick={clearMessages}
                className="text-red-600 hover:text-red-800 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* API Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <Button
                variant="link"
                onClick={loadCartItems}
                className="text-red-600 hover:text-red-800"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Summary Cards */}
          {!loading && groups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary.totalCustomers}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Items</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary.totalItems}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-2xl font-bold text-green-600">
                        Rs. {summary.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Requested Items</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {requestedItemsCount}
                      </p>
                      {requestedItemsCount > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Awaiting fulfillment
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cart Groups */}
          {!loading && groups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Cart is empty
              </h3>
              <p className="text-gray-500 mt-1">No items found in the cart</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.customer_nic);
                const customer = group.customer_details?.customer;

                return (
                  <Card
                    key={group.customer_nic}
                    className="bg-white overflow-hidden"
                  >
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(group.customer_nic)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="cursor-pointer hover:bg-gray-50 transition-colors">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                  {customer?.image ? (
                                    <img
                                      src={`https://application.goldenasia.lk/api/${customer.image}`}
                                      alt={customer?.name || customer?.cname}
                                      className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <User className="w-6 h-6 text-orange-500" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {customer?.name ||
                                      customer?.cname ||
                                      group.customer_nic}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-50"
                                    >
                                      <CreditCard className="w-3 h-3 mr-1" />
                                      {group.customer_nic}
                                    </Badge>
                                    {customer?.phone1 && (
                                      <Badge
                                        variant="outline"
                                        className="bg-gray-50"
                                      >
                                        <Phone className="w-3 h-3 mr-1" />
                                        {customer.phone1}
                                      </Badge>
                                    )}
                                    {customer?.center && (
                                      <Badge
                                        variant="outline"
                                        className="bg-gray-50"
                                      >
                                        Center: {customer.center}
                                      </Badge>
                                    )}
                                  </div>
                                  {customer?.address && (
                                    <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
                                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      {customer.address}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">
                                    Items: {group.total_items}
                                  </p>
                                  <p className="text-lg font-bold text-orange-600">
                                    Rs. {group.total_amount.toFixed(2)}
                                  </p>
                                  {/* ✅ Pending fulfillment warning */}
                                  {isGroupLocked(group) && (
                                    <p className="text-xs font-medium text-amber-600 mt-0.5 flex items-center justify-end gap-1">
                                      <Clock className="w-3 h-3" />
                                      {getGroupRequestedCount(group)} pending
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* ✅ Approve button — disabled if group is locked */}
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isGroupLocked(group)) return;
                                      openApprovalModal(group);
                                    }}
                                    disabled={isGroupLocked(group)}
                                    title={
                                      isGroupLocked(group)
                                        ? "Some items are still pending fulfillment. Wait for the request to be fulfilled."
                                        : ""
                                    }
                                    className={`text-white ${
                                      isGroupLocked(group)
                                        ? "bg-gray-400 cursor-not-allowed opacity-60"
                                        : ""
                                    }`}
                                    size="sm"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {isGroupLocked(group)
                                      ? "Pending Fulfillment"
                                      : "Approve"}
                                  </Button>

                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="px-4 sm:px-6 pb-6">
                          <div className="border-t border-gray-200 pt-4 space-y-3">
                            {group.items.map((item) => {
                              const imageUrl =
                                item.images && item.images[0]
                                  ? getImageUrl(item.images[0])
                                  : null;
                              const price = parseFloat(item.price || 0);
                              const total = parseFloat(item.total_amount || 0);

                              return (
                                <div
                                  key={item.id}
                                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mx-auto sm:mx-0">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={item.product_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-6 h-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          {item.product_name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                          <Badge
                                            variant="secondary"
                                            className="bg-gray-200 text-xs"
                                          >
                                            {item.category}
                                          </Badge>
                                          <span className="text-xs text-gray-500 font-mono">
                                            {item.product_id}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-md font-bold text-gray-900">
                                          Rs. {price.toFixed(2)}
                                        </div>
                                        {item.quantity > 1 && (
                                          <div className="text-xs text-gray-500">
                                            × {item.quantity} = Rs.{" "}
                                            {total.toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-2 border-t border-gray-200">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-gray-400">
                                          Added: {formatDate(item.created_at)}
                                        </span>

                                        {/* ✅ Status badge */}
                                        {item.status === "requested" ? (
                                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-medium">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Pending Fulfillment
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] font-medium">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Ready
                                          </Badge>
                                        )}

                                        {/* ✅ Remove button — disabled for requested items */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeItem(item.id)}
                                          disabled={
                                            removing === item.id ||
                                            item.status === "requested"
                                          }
                                          title={
                                            item.status === "requested"
                                              ? "Cannot remove — waiting for fulfillment"
                                              : ""
                                          }
                                          className={`${
                                            item.status === "requested"
                                              ? "text-gray-400 cursor-not-allowed opacity-50"
                                              : "text-red-500 hover:text-red-700 hover:bg-red-50"
                                          }`}
                                        >
                                          {removing === item.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ApprovalModal
        isOpen={showApprovalModal}
        selectedGroup={selectedGroup}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedGroup(null);
          setApprovalError(null);
        }}
        onApprove={async ({
          customerAddress,
          customerPhone,
          periodWeeks,
          courierCharge,
          purchaseAgreement,
          productIds,
          firstItem,
          totalAmount,
          customer,
          userId,
          productWeight,
        }) => {
          setApproving(true);
          setApprovalError(null);
          clearMessages();

          try {
            const formData = new FormData();
            formData.append("customer_nic", selectedGroup.customer_nic);
            formData.append(
              "customer_name",
              customer?.name || customer?.cname || selectedGroup.customer_nic,
            );
            formData.append("customer_address", customerAddress);
            formData.append("customer_phone", customerPhone);
            formData.append("product_ids", JSON.stringify(productIds));
            formData.append("product_id", firstItem?.product_id || "");
            formData.append("total_amount", String(totalAmount));
            formData.append("price", String(parseFloat(firstItem?.price || 0)));
            formData.append("quantity", String(firstItem?.quantity || 1));
            formData.append("center", customer?.center || "");
            formData.append("ccode", customer?.ccode || "");
            formData.append("bname", customer?.bname || "");
            formData.append("customer_code", customer?.customer_code || "");
            formData.append("period_weeks", String(periodWeeks));
            formData.append("created_by", userId);
            formData.append("product_weight", String(productWeight));
            formData.append("courier_charge", String(courierCharge));

            if (purchaseAgreement) {
              formData.append("purchase_agreement", purchaseAgreement);
            }

            const response = await fetch(`${API_BASE_URL}/loans/submit`, {
              method: "POST",
              body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Failed to submit product loan");
            }

            setShowApprovalModal(false);
            setSelectedGroup(null);

            // ✅ Show success message instead of alert
            setSuccessMessage(`✅ Product loan approved successfully!`);
            setSuccessDetails({
              loanCode: data.data.loanCode,
              orderCode: data.data.orderCode,
              total: data.data.loan.total_amount.toFixed(2),
              courierCharge: data.data.courierCharge.toFixed(2),
              totalWithCourier: data.data.totalWithCourier.toFixed(2),
              weekPayment: data.data.weekPayment.toFixed(2),
            });

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
              setSuccessMessage(null);
              setSuccessDetails(null);
            }, 10000);

            await loadCartItems();
          } catch (err: any) {
            console.error("Error approving loan:", err);
            setApprovalError(err.message || "Failed to approve loan");
          } finally {
            setApproving(false);
          }
        }}
        approving={approving}
        approvalError={approvalError}
        userId={userId}
      />
    </div>
  );
};

export default ProductCart;
