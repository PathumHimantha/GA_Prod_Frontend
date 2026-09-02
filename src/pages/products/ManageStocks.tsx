import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import StockUpdateModal from "@/components/products/StockUpdateModal";
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
import { Pencil, Package, AlertCircle, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";

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

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

const ManageStocks = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<number | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const loadProducts = async (page = 1, search = "", cat = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (cat && cat !== "all") params.append("category", cat);

      const response = await fetch(
        `${API_BASE_URL}/products?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();

      if (data.success) {
        setProducts(data.data || []);
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
          },
        );
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
    loadProducts(currentPage, searchTerm, category);
  }, [currentPage, searchTerm, category]);

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

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category || "Other"))),
    [products],
  );

  const columns: ColumnDef<Product>[] = [
    {
      key: "product_id",
      header: "Product ID",
      render: (v) => (
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
          {v}
        </span>
      ),
    },
    {
      key: "name",
      header: "Product",
      render: (_v, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-500 line-clamp-1">
            {row.category}
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Current Stock",
      render: (v, row) => {
        const stock = Number(v || 0);
        return (
          <div className="flex flex-col">
            <span
              className={`text-lg font-bold ${
                stock === 0
                  ? "text-red-600"
                  : stock < 5
                    ? "text-orange-500"
                    : "text-green-600"
              }`}
            >
              {stock}
            </span>
            {stock === 0 && (
              <span className="text-xs text-red-500">Out of stock</span>
            )}
            {stock > 0 && stock < 5 && (
              <span className="text-xs text-orange-500">Low stock</span>
            )}
            {stock >= 5 && (
              <span className="text-xs text-green-500">In stock</span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Stock Status",
      render: (_v, row) => {
        const status =
          row.stock === 0
            ? "out-of-stock"
            : row.stock < 5
              ? "low-stock"
              : "in-stock";
        return <StatusBadge status={status} />;
      },
    },
    {
      key: "updated_at",
      header: "Last Updated",
      render: (v) => {
        if (!v) return "—";
        try {
          return new Date(String(v)).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return "—";
        }
      },
    },
    {
      key: "actions",
      header: "Action",
      render: (_v, row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSelectedProduct(row);
            setStockModal(row.id);
          }}
          title="Update Stock"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Update</span>
        </Button>
      ),
    },
  ];

  const handleStockUpdated = async () => {
    await loadProducts(currentPage, searchTerm, category);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Stocks</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and update product inventory levels
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadProducts(currentPage, searchTerm, category)}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* Stock Statistics */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Products</div>
            <div className="text-2xl font-bold text-gray-900">
              {products.length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">In Stock</div>
            <div className="text-2xl font-bold text-green-600">
              {products.filter((p) => p.stock >= 5).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Low Stock</div>
            <div className="text-2xl font-bold text-orange-500">
              {products.filter((p) => p.stock > 0 && p.stock < 5).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">
              {products.filter((p) => p.stock === 0).length}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="link"
            onClick={() => loadProducts(currentPage, searchTerm, category)}
            className="ml-auto text-sm"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DynamicTable
          data={products}
          columns={columns}
          filterKey="category"
          filterOptions={categories.map((c) => ({ label: c, value: c }))}
          filterAllLabel="All Categories"
          searchKeys={["name", "product_id", "category"]}
          pageSize={10}
          loading={loading}
          emptyMessage={error ? "Failed to load products" : "No products found"}
          onSearch={handleSearch}
          onPageChange={handlePageChange}
          totalItems={pagination.totalItems}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      </div>

      <StockUpdateModal
        open={!!stockModal}
        onClose={() => {
          setStockModal(undefined);
          setSelectedProduct(null);
        }}
        productId={stockModal}
        productName={selectedProduct?.name}
        currentStock={selectedProduct?.stock}
        onUpdated={handleStockUpdated}
      />
    </div>
  );
};

export default ManageStocks;
