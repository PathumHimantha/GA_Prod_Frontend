import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/apiConfig";
import {
  ShoppingCart,
  Package,
  Search,
  Filter,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertCircle,
  RefreshCw,
  X,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Product = {
  id: number;
  product_id: string;
  category: string;
  name: string;
  description: string;
  price: string | number;
  retail_price: string | number;
  discount: string | number;
  stock: number;
  status: "active" | "inactive";
  images: string[];
  created_at: string;
  updated_at: string;
};

type CategoryCount = {
  category: string;
  count: number;
};

const ProductDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [showCart, setShowCart] = useState(false);
  const navigate = useNavigate();
  // Helper function to get numeric price
  const getNumericPrice = (price: string | number): number => {
    return typeof price === "string" ? parseFloat(price) : price;
  };

  // Get current date for header
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });

  // Fetch products
  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/products?page=1&limit=100`);
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();

      if (data.success) {
        const productsWithNumbers = data.data.map((product: any) => ({
          ...product,
          price:
            typeof product.price === "string"
              ? parseFloat(product.price)
              : product.price,
          retail_price:
            typeof product.retail_price === "string"
              ? parseFloat(product.retail_price)
              : product.retail_price,
          discount:
            typeof product.discount === "string"
              ? parseFloat(product.discount)
              : product.discount,
        }));
        setProducts(productsWithNumbers || []);
      } else {
        throw new Error(data.error || "Failed to fetch products");
      }
    } catch (err: any) {
      console.error("Error loading products:", err);
      setError(err.message || "Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Get unique categories with counts
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    products.forEach((product) => {
      const cat = product.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const result: CategoryCount[] = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));

    return result;
  }, [products]);

  // Dashboard statistics
  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter(
      (p) => p.status === "active" && p.stock > 0,
    ).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const onSale = products.filter(
      (p) => getNumericPrice(p.discount) > 0,
    ).length;
    return { total, available, outOfStock, onSale };
  }, [products]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.product_id.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search),
      );
    }

    filtered = filtered.filter((p) => p.status === "active" && p.stock > 0);

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  // Cart functions
  const addToCart = (productId: number) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId] -= 1;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    let total = 0;
    let items = 0;
    products.forEach((product) => {
      const quantity = cart[product.id] || 0;
      if (quantity > 0) {
        const price = getNumericPrice(product.price);
        total += price * quantity;
        items += quantity;
      }
    });
    return { total, items };
  };

  const { total, items } = getCartTotal();

  // Get image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    return `${API_BASE_URL}${imagePath}`;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl w-48"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </Card>
              ))}
            </div>
            <div className="flex gap-3 mb-8 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-200 rounded-full w-24 flex-shrink-0"
                ></div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="p-4">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Product Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Explore products and add to cart
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{dateStr}</span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {dayName}
            </span>
          </div>
        </div>

        {/* Search and Cart */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-gray-200 focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={loadProducts}
              className="border-gray-200 hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowCart(!showCart)}
              variant="outline"
              className="relative border-gray-200 hover:bg-gray-100"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="ml-2">Cart</span>
              {items > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {items}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <Button
              variant="link"
              onClick={loadProducts}
              className="text-red-600 hover:text-red-800"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-500 font-medium">
                    Total Products
                  </Label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-500 font-medium">
                    Available
                  </Label>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.available}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-500 font-medium">
                    On Sale
                  </Label>
                  <p className="text-2xl font-bold text-orange-500 mt-1">
                    {stats.onSale}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Percent className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-500 font-medium">
                    Out of Stock
                  </Label>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {stats.outOfStock}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <Label className="text-sm font-medium text-gray-700">
              Categories
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedCategory("all")}
              variant={selectedCategory === "all" ? "default" : "outline"}
              className={`rounded-full text-sm font-medium transition-all ${
                selectedCategory === "all"
                  ? " text-white shadow-md"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              All ({products.length})
            </Button>
            {categories.map(({ category, count }) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "text-white shadow-md"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {category} ({count})
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No products found
            </h3>
            <p className="text-gray-500 mt-1">
              {searchTerm
                ? "Try adjusting your search"
                : "No products available in this category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const price = getNumericPrice(product.price);
              const retailPrice = getNumericPrice(product.retail_price);
              const discount = getNumericPrice(product.discount);

              return (
                <Card
                  key={product.id}
                  className="group bg-white hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 hover:border-orange-300"
                >
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      {product.images && product.images[0] ? (
                        <img
                          src={getImageUrl(product.images[0]) || ""}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).style.display =
                              "none")
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-300" />
                        </div>
                      )}

                      {product.stock <= 5 && product.stock > 0 && (
                        <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded">
                          Only {product.stock} left
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">
                          {product.name}
                        </h3>
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded flex-shrink-0 ml-2">
                          {product.product_id}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        <Label className="text-xs text-gray-500">
                          Category:
                        </Label>
                        <span className="text-xs font-medium text-blue-600">
                          {product.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            Rs. {price.toFixed(2)}
                          </div>
                          {retailPrice > price && (
                            <div className="text-xs text-gray-400 line-through">
                              Rs. {retailPrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() =>
                            navigate(`/dashboard/product/${product.id}`)
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all text-sm hover:shadow-md active:scale-95"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Buy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <Card className="relative w-full max-w-md h-full shadow-2xl overflow-y-auto rounded-none animate-in slide-in-from-right">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Your Cart</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              {items === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {products.map((product) => {
                      const quantity = cart[product.id] || 0;
                      if (quantity === 0) return null;
                      const price = getNumericPrice(product.price);
                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {product.images && product.images[0] ? (
                              <img
                                src={getImageUrl(product.images[0]) || ""}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) =>
                                  ((
                                    e.target as HTMLImageElement
                                  ).style.display = "none")
                                }
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Rs. {price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(product.id)}
                              className="h-8 w-8 hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => addToCart(product.id)}
                              className="h-8 w-8 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-200 mt-6 pt-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>Rs. {total.toFixed(2)}</span>
                    </div>
                    <Button className="w-full mt-4  text-white py-3 rounded-lg font-medium transition-colors">
                      Proceed to Checkout
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Cart Button (Mobile) */}
      {items > 0 && !showCart && (
        <Button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 md:hidden  text-white p-4 rounded-full shadow-lg transition-colors h-auto w-auto"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {items}
            </span>
          </div>
        </Button>
      )}
    </div>
  );
};

export default ProductDashboard;
