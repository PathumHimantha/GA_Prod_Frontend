import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/apiConfig";
import {
  Package,
  ShoppingCart,
  ArrowLeft,
  Truck,
  Shield,
  RotateCcw,
  Calendar,
  Tag,
  Percent,
  AlertCircle,
  Minus,
  Plus,
  X,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Product = {
  id: number;
  product_id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  retail_price: number;
  discount: number;
  stock: number;
  status: "active" | "inactive";
  images: string[];
  created_at: string;
  updated_at: string;
};

const SingleProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Modal states
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [customerNic, setCustomerNic] = useState("");
  const [nicError, setNicError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

  // Success message state
  const [successMessage, setSuccessMessage] = useState<{
    show: boolean;
    productName: string;
    customerNic: string;
    quantity: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch product");
        }
        const data = await response.json();
        if (data.success) {
          setProduct(data.data);
          if (data.data.images && data.data.images.length > 0) {
            setSelectedImage(data.data.images[0]);
          }
        } else {
          throw new Error(data.error || "Failed to fetch product");
        }
      } catch (err: any) {
        console.error("Error loading product:", err);
        setError(err.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    return `${API_BASE_URL}${imagePath}`;
  };

  const getNumericPrice = (price: number) => {
    return typeof price === "string" ? parseFloat(price) : price;
  };

  const handleQuantityChange = (amount: number) => {
    if (product) {
      const newQuantity = quantity + amount;
      if (newQuantity >= 1 && newQuantity <= product.stock) {
        setQuantity(newQuantity);
      }
    }
  };

  const handleAddToCart = () => {
    setShowAddToCartModal(true);
    setCustomerNic("");
    setNicError(null);
    setSuccessMessage(null);
  };

  const validateNic = (nic: string) => {
    const oldNicPattern = /^[0-9]{9}[VX]$/i;
    const newNicPattern = /^[0-9]{12}$/;
    return oldNicPattern.test(nic) || newNicPattern.test(nic);
  };

  const handleConfirmAddToCart = async () => {
    if (!customerNic.trim()) {
      setNicError("Please enter Customer NIC");
      return;
    }

    if (!validateNic(customerNic.trim())) {
      setNicError(
        "Please enter a valid NIC (e.g., 123456789V or 123456789012)",
      );
      return;
    }

    setAddingToCart(true);
    setNicError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: product?.product_id,
          customer_nic: customerNic.trim().toUpperCase(),
          quantity: quantity,
          created_by: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setNicError(
            `❌ Customer ${customerNic} already has ${data.data?.count || ""} item(s) in cart. Please check the existing cart.`,
          );
          setAddingToCart(false);
          return;
        }
        throw new Error(data.error || "Failed to add to cart");
      }

      // Success - close modal and show success message
      setShowAddToCartModal(false);
      setSuccessMessage({
        show: true,
        productName: product?.name || "",
        customerNic: customerNic.trim().toUpperCase(),
        quantity: quantity,
        total: getNumericPrice(product?.price || 0) * quantity,
      });

      setCustomerNic("");
      setQuantity(1);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      setNicError(error.message || "Failed to add to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  const dismissSuccessMessage = () => {
    setSuccessMessage(null);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-4">
                <div className="aspect-square bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {error || "Product not found"}
            </h3>
            <p className="text-gray-500 mt-1">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const price = getNumericPrice(product.price);
  const retailPrice = getNumericPrice(product.retail_price);
  const discount = getNumericPrice(product.discount);
  const isInStock = product.stock > 0;
  const isLowStock = product.stock <= 5 && product.stock > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">
                    ✅ Product Added to Cart!
                  </h4>
                  <div className="mt-1 space-y-0.5 text-sm text-green-700">
                    <p>
                      <span className="font-medium">Product:</span>{" "}
                      {successMessage.productName}
                    </p>
                    <p>
                      <span className="font-medium">Customer NIC:</span>{" "}
                      {successMessage.customerNic}
                    </p>
                    <p>
                      <span className="font-medium">Quantity:</span>{" "}
                      {successMessage.quantity}
                    </p>
                    <p className="font-semibold text-green-800">
                      Total: Rs. {successMessage.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissSuccessMessage}
                className="text-green-600 hover:text-green-800 hover:bg-green-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Images */}
            <div>
              <Card className="overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gray-100 relative">
                    {selectedImage ? (
                      <img
                        src={getImageUrl(selectedImage) || ""}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.display =
                            "none")
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-32 h-32 text-gray-300" />
                      </div>
                    )}

                    {isLowStock && (
                      <div className="absolute bottom-4 left-4 bg-orange-500 text-white text-sm font-medium px-3 py-1.5 rounded">
                        Only {product.stock} left
                      </div>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {product.images && product.images.length > 1 && (
                    <div className="flex gap-2 p-4 overflow-x-auto">
                      {product.images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(img)}
                          className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                            selectedImage === img
                              ? "border-orange-500 shadow-md"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={getImageUrl(img) || ""}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.display =
                                "none")
                            }
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Product Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {product.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="bg-gray-100">
                        {product.category}
                      </Badge>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                        {product.product_id}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={isInStock ? "default" : "destructive"}
                    className={isInStock ? "bg-green-500" : ""}
                  >
                    {isInStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>
              </div>

              {/* Price Section */}
              <div className="flex items-end gap-3">
                <div className="text-3xl font-bold text-gray-900">
                  Rs. {price.toFixed(2)}
                </div>
                {retailPrice > price && (
                  <div className="text-lg text-gray-400 line-through">
                    Rs. {retailPrice.toFixed(2)}
                  </div>
                )}
                {discount > 0 && (
                  <div className="text-sm font-semibold text-green-600">
                    Save {discount}%
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Description
                </h3>
                <div className="text-sm text-gray-600 whitespace-pre-line">
                  {product.description}
                </div>
              </div>

              {/* Features / Delivery Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Truck className="w-4 h-4 text-orange-500" />
                  <span>Cash On Delivery</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Shield className="w-4 h-4 text-orange-500" />
                  <span>Company Warranty</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  <span>Service Available</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Package className="w-4 h-4 text-orange-500" />
                  <span>{product.stock} Units Left</span>
                </div>
              </div>

              {/* Quantity and Add to Cart */}
              {isInStock && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-gray-700">
                      Quantity
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="h-8 w-8"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-12 text-center font-medium">
                        {quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= product.stock}
                        className="h-8 w-8"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-xs text-gray-500">
                      Max: {product.stock}
                    </span>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart - Rs. {(price * quantity).toFixed(2)}
                  </Button>
                </div>
              )}

              {/* Stock Info */}
              {!isInStock && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-600 font-medium">Out of Stock</p>
                  <p className="text-sm text-red-500">
                    This product is currently unavailable
                  </p>
                </div>
              )}

              {/* Product ID and Date */}
              <div className="text-xs text-gray-400 pt-4 border-t border-gray-200">
                <p>Product ID: {product.product_id}</p>
                <p>
                  Added: {new Date(product.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Modal - Enter NIC */}
      {showAddToCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddToCartModal(false)}
          />
          <Card className="relative w-full max-w-md shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Add to Cart
                  </h2>
                  <p className="text-sm text-gray-500">
                    Enter customer NIC to proceed
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowAddToCartModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  disabled={addingToCart}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerNic" className="text-sm font-medium">
                    Customer NIC <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerNic"
                    type="text"
                    placeholder="e.g., 123456789V or 123456789012"
                    value={customerNic}
                    onChange={(e) => {
                      setCustomerNic(e.target.value);
                      setNicError(null);
                    }}
                    className={`mt-1 ${nicError ? "border-red-500" : ""}`}
                    disabled={addingToCart}
                    autoFocus
                  />
                  {nicError && (
                    <p className="text-sm text-red-500 mt-1">{nicError}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Enter NIC in format: 123456789V (old) or 123456789012 (new)
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Product</span>
                    <span className="font-medium text-gray-900">
                      {product?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Quantity</span>
                    <span className="font-medium text-gray-900">
                      {quantity}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 font-bold">
                    <span className="text-gray-600">Total</span>
                    <span className="text-orange-600">
                      Rs. {(price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddToCartModal(false)}
                    className="flex-1"
                    disabled={addingToCart}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmAddToCart}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={addingToCart}
                  >
                    {addingToCart ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
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
                        Adding...
                      </span>
                    ) : (
                      "Confirm Add to Cart"
                    )}
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

export default SingleProduct;
