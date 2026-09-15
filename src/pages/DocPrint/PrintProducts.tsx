import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/apiConfig";
import {
  Printer,
  Package,
  Search,
  Filter,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const catalogTemplate = "/templates/catalog.html";
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

const PRINT_PRODUCTS_PER_PAGE = 4;

const PrintProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
        setFilteredProducts(productsWithNumbers || []);
      } else {
        throw new Error(data.error || "Failed to fetch products");
      }
    } catch (err: any) {
      console.error("Error loading products:", err);
      setError(err.message || "Failed to load products");
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products by category and search
  useEffect(() => {
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
          p.category.toLowerCase().includes(search),
      );
    }

    // Only show active products with stock
    filtered = filtered.filter((p) => p.status === "active" && p.stock > 0);
    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  // Get unique categories with counts
  const categories = React.useMemo(() => {
    const categoryMap = new Map<string, number>();
    products.forEach((product) => {
      const cat = product.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [products]);

  // Get image URL
  const getImageUrl = (imagePath: string) => {
    return imagePath || null;
  };

  const handlePrint = async () => {
    try {
      const payload = filteredProducts.map((product) => ({
        name: product.name,
        productId: product.product_id,
        category: product.category,
        price: getNumericPrice(product.price),
        retailPrice: getNumericPrice(product.retail_price),
        image:
          product.images && product.images[0]
            ? getImageUrl(product.images[0])
            : null,
        descriptionPoints: formatDescription(product.description || ""),
      }));

      const response = await fetch(catalogTemplate);
      if (!response.ok) {
        throw new Error("Failed to load catalog template");
      }

      let templateHtml = await response.text();
      const dataScript = `<script>
        window.__CATALOG_PRODUCTS__ = ${JSON.stringify(payload)};
        window.__CATALOG_DATE__ = ${JSON.stringify(dateStr)};
      <\/script>`;

      const finalHtml = templateHtml.replace(
        "<!-- CATALOG_DATA -->",
        dataScript,
      );

      const printWindow = window.open("", "_blank", "width=900,height=1200");
      if (!printWindow) {
        alert("Please allow pop-ups to print the catalog.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(finalHtml);
      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      console.error("Failed to generate catalog print preview:", error);
      alert("Failed to generate printable catalog. Please try again.");
    }
  };
  // Format description as bullet points with better parsing
  const formatDescription = (description: string) => {
    if (!description) return [];

    // Split by newlines first
    let points = description.split(/\n+/).filter((s) => s.trim());

    // If no newlines, split by periods
    if (points.length === 1) {
      points = description.split(/\.\s+/).filter((s) => s.trim());
    }

    // If still only one, split by commas
    if (points.length === 1) {
      points = description.split(/,\s+/).filter((s) => s.trim());
    }

    // Clean up each point
    return points
      .map((p) => p.trim().replace(/^[•\-]\s*/, ""))
      .filter((p) => p.length > 0);
  };

  // Group products for A4 layout (4 per page - 2x2)
  const getProductPages = () => {
    const pages: Product[][] = [];
    for (let i = 0; i < filteredProducts.length; i += PRINT_PRODUCTS_PER_PAGE) {
      pages.push(filteredProducts.slice(i, i + PRINT_PRODUCTS_PER_PAGE));
    }
    return pages;
  };

  const productPages = getProductPages();

  // Loading skeleton
  if (loading) {
    return (
      <div
        id="print-products-root"
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      >
        <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
              </div>
              <div className="flex gap-3 mb-8 overflow-x-auto">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-gray-200 rounded-full w-24 flex-shrink-0"
                  ></div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
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
      </div>
    );
  }

  return (
    <div
      id="print-products-root"
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
    >
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* HEADER - Hidden when printing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Print Products
            </h1>
            <p className="text-sm text-gray-500">
              Generate printable product catalog
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{dateStr}</span>
            </div>
            <Button
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Error Message - Hidden when printing */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-red-500 flex-shrink-0" />
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

        {/* Search and Filter - Hidden when printing */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-gray-200 focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadProducts}
            className="border-gray-200 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Tabs - Hidden when printing */}
        <div className="mb-8 print:hidden">
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
                  ? "bg-orange-500 text-white shadow-md"
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
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {category} ({count})
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid - Print Layout */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200 print:hidden">
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
          <>
            {productPages.map((pageProducts, pageIndex) => (
              <div
                key={pageIndex}
                className={pageIndex > 0 ? "page-break-before" : ""}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  gap: "0.75rem",
                  height: "100%",
                  minHeight: "100%",
                  pageBreakAfter:
                    pageIndex < productPages.length - 1 ? "always" : "auto",
                  padding: "0",
                }}
              >
                {pageProducts.map((product) => {
                  const price = getNumericPrice(product.price);
                  const retailPrice = getNumericPrice(product.retail_price);
                  const descriptionPoints = formatDescription(
                    product.description || "",
                  );

                  return (
                    <Card
                      key={product.id}
                      className="print-card bg-white border border-gray-200 overflow-hidden shadow-sm"
                      style={{
                        breakInside: "avoid",
                        pageBreakInside: "avoid",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <CardContent className="p-0 h-full flex flex-col">
                        {/* Image - Large, prominent */}
                        <div
                          className="print-image-wrap relative w-full bg-gray-50 border-b border-gray-200 flex items-center justify-center overflow-hidden"
                          style={{ height: "55%" }}
                        >
                          {product.images && product.images[0] ? (
                            <img
                              src={getImageUrl(product.images[0]) || ""}
                              alt={product.name}
                              className="w-full h-full object-contain p-2"
                              onError={(e) =>
                                ((e.target as HTMLImageElement).style.display =
                                  "none")
                              }
                            />
                          ) : (
                            <Package className="w-16 h-16 text-gray-300" />
                          )}
                        </div>

                        {/* Info - Bottom section */}
                        <div className="flex-1 p-2 flex flex-col justify-between overflow-hidden">
                          <div className="overflow-hidden">
                            {/* Product Name and Code */}
                            <div className="flex items-start justify-between gap-1 mb-0.5">
                              <h3 className="print-title font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
                                {product.name}
                              </h3>
                              <span className="print-code text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                {product.product_id}
                              </span>
                            </div>

                            {/* Category */}
                            <span className="print-category inline-block text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mb-1">
                              {product.category}
                            </span>

                            {/* Description as bullet points */}
                            {descriptionPoints.length > 0 && (
                              <ul className="print-desc space-y-0.5 mt-1">
                                {descriptionPoints
                                  .slice(0, 4)
                                  .map((point, idx) => (
                                    <li
                                      key={idx}
                                      className="text-gray-600 flex items-start gap-1 leading-snug text-xs"
                                    >
                                      <span className="text-gray-400">•</span>
                                      <span className="line-clamp-1">
                                        {point}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>

                          {/* Price */}
                          <div className="flex items-baseline gap-2 pt-1 mt-1 border-t border-gray-100">
                            <span className="print-price text-base font-bold text-gray-900">
                              Rs. {price.toFixed(2)}
                            </span>
                            {retailPrice > price && (
                              <span className="text-[10px] text-gray-400 line-through">
                                Rs. {retailPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {/* Fill empty slots */}
                {pageProducts.length < PRINT_PRODUCTS_PER_PAGE &&
                  Array.from({
                    length: PRINT_PRODUCTS_PER_PAGE - pageProducts.length,
                  }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 text-sm print:hidden"
                    >
                      Empty
                    </div>
                  ))}
              </div>
            ))}

            {/* Print Footer */}
            <div className="hidden print:block mt-2 text-center text-xs text-gray-500 border-t border-gray-300 pt-2">
              <p>Generated from Product Dashboard</p>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
          }

          body {
            visibility: hidden;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #print-products-root,
          #print-products-root * {
            visibility: visible;
          }
          #print-products-root {
            display: block;
            visibility: visible;
            margin: 0 !important;
            padding: 0 !important;
          }

          #print-products-root > div.w-full {
            padding: 0 !important;
            margin: 0 !important;
          }

          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .page-break-before {
            page-break-before: always;
          }

          .shadow-sm {
            box-shadow: none !important;
          }
          .border {
            border-color: #e5e7eb !important;
          }
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          .bg-blue-50 {
            background-color: #eff6ff !important;
          }
          .bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .bg-white {
            background-color: white !important;
          }
          .text-gray-900 {
            color: #111827 !important;
          }
          .text-gray-600 {
            color: #4b5563 !important;
          }
          .text-gray-500 {
            color: #6b7280 !important;
          }
          .text-blue-600 {
            color: #2563eb !important;
          }
          .text-gray-400 {
            color: #9ca3af !important;
          }

          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 2x2 grid with equal height cards */
          #print-products-root > div > div[style*="display: grid"] {
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            page-break-after: always !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            height: 100% !important;
            max-height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .print-image-wrap {
            height: 55% !important;
            min-height: 55% !important;
            max-height: 55% !important;
          }

          .print-title {
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
          .print-code {
            font-size: 8px !important;
          }
          .print-category {
            font-size: 8px !important;
          }
          .print-desc li {
            font-size: 8.5px !important;
            line-height: 1.2 !important;
          }
          .print-price {
            font-size: 13px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintProducts;
