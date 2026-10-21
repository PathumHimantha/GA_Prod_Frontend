// src/pages/dashboard/staff/StaffSingleProduct.tsx
import React, { useEffect, useState } from "react";
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
  AlertCircle,
  Minus,
  Plus,
  X,
  CheckCircle,
  Weight,
  Banknote,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import BuyRequestsProd, { BuyRequestProduct } from "./BuyRequestsProd";

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
  product_weight: string | number;
  courier_fee: string | number;
};

const StaffSingleProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"buy" | "request">("buy");
  const [successMessage, setSuccessMessage] = useState<{
    mode: "buy" | "request";
    productName: string;
    quantity: number;
    total?: number;
  } | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!response.ok) throw new Error("Failed to fetch product");
        const data = await response.json();
        if (data.success) {
          setProduct(data.data);
          if (data.data.images?.length > 0)
            setSelectedImage(data.data.images[0]);
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
    if (id) loadProduct();
  }, [id]);

  const getNumericPrice = (p: number | string) =>
    typeof p === "string" ? parseFloat(p) : p;

  const handleQuantityChange = (amount: number) => {
    if (product) {
      const next = quantity + amount;
      if (next >= 1 && next <= Math.max(1, product.stock)) setQuantity(next);
    }
  };

  const openModal = (mode: "buy" | "request") => {
    setModalMode(mode);
    setModalOpen(true);
    setSuccessMessage(null);
  };

  /* ---------- loading / error states ---------- */
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="aspect-square bg-gray-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto text-center py-16 bg-white rounded-xl border">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium">
            {error || "Product not found"}
          </h3>
          <Button
            onClick={() => navigate("/dashboard/staff-store")}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Staff Store
          </Button>
        </div>
      </div>
    );
  }
  const calculateDocumentFee = (totalAmount: number | string) => {
    const amount = parseFloat(String(totalAmount)) || 0;
    if (amount > 30000) return 1500;
    if (amount >= 15000) return 1000;
    return 500;
  };
  const price = getNumericPrice(product.price);
  const retailPrice = getNumericPrice(product.retail_price);
  const discount = getNumericPrice(product.discount);
  const isInStock = product.stock > 0;
  const isLowStock = product.stock <= 5 && product.stock > 0;

  const weight = parseFloat(String(product.product_weight ?? 0)) || 0;
  const courierFee = parseFloat(String(product.courier_fee ?? 0)) || 0;
  const PERIOD_MONTHS = 6;
  const weeklyPayment = price / PERIOD_MONTHS;
  const documentFee = calculateDocumentFee(price);

  const modalProduct: BuyRequestProduct = {
    id: product.id,
    product_id: product.product_id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    images: product.images,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/staff-store")}
            className="mb-6 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Staff Store
          </Button>

          {/* Success banner */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">
                    {successMessage.mode === "buy"
                      ? "✅ Added to Staff Cart!"
                      : "✅ Staff Request Submitted!"}
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    {successMessage.productName} × {successMessage.quantity}
                    {successMessage.total !== undefined && (
                      <>
                        {" "}
                        — Total:{" "}
                        <span className="font-semibold">
                          Rs. {successMessage.total.toFixed(2)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800 hover:bg-green-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
            {/* LEFT — images */}
            <div>
              <Card className="overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gray-100 relative">
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
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
                  {product.images?.length > 1 && (
                    <div className="flex gap-2 p-4 overflow-x-auto">
                      {product.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(img)}
                          className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                            selectedImage === img
                              ? "border-orange-500 shadow-md"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT — details */}
            <div className="space-y-6">
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

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Description
                </h3>
                <div className="text-sm text-gray-600 whitespace-pre-line">
                  {product.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {weight > 0 && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <Weight className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Weight</p>
                      <p className="text-sm font-semibold">
                        {weight.toFixed(2)} kg
                      </p>
                    </div>
                  </div>
                )}
                {courierFee > 0 && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs text-gray-500">Courier Fee</p>
                      <p className="text-sm font-semibold">
                        Rs. {courierFee.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg p-3">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">
                      Monthly ({PERIOD_MONTHS} months)
                    </p>
                    <p className="text-sm font-semibold">
                      Rs. {weeklyPayment.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-500">Document Fee</p>
                    <p className="text-sm font-semibold">
                      Rs. {documentFee.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Truck className="w-4 h-4 text-orange-500" /> Cash on delivery
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Shield className="w-4 h-4 text-orange-500" /> Warranty
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <RotateCcw className="w-4 h-4 text-orange-500" /> Service
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Package className="w-4 h-4 text-orange-500" />{" "}
                  {product.stock} left
                </div>
              </div>

              {/* Buy / Request actions */}
              {isInStock ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium">Quantity</Label>
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
                    onClick={() => openModal("buy")}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy for Myself — Rs. {(price * quantity).toFixed(2)}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => openModal("request")}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 text-lg font-semibold"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Request When In Stock
                </Button>
              )}

              <div className="text-xs text-gray-400 pt-4 border-t">
                <p>Product ID: {product.product_id}</p>
                <p>
                  Added: {new Date(product.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared modal */}
      <BuyRequestsProd
        open={modalOpen}
        mode={modalMode}
        product={modalProduct}
        defaultQuantity={quantity}
        onClose={() => setModalOpen(false)}
        onSuccess={(result) => {
          setSuccessMessage({
            mode: modalMode,
            productName: product.name,
            quantity: result?.quantity ?? quantity,
            total: result?.total_amount ?? price * quantity,
          });
        }}
      />
    </div>
  );
};

export default StaffSingleProduct;
