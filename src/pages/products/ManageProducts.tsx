import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProductModal from "@/components/products/ProductModal";
import DeleteConfirmationModal from "@/components/products/DeleteConfirmationModal";
import StatusBadge from "@/components/ui/StatusBadge";
import StockUpdateModal from "@/components/products/StockUpdateModal";
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
  Plus,
  Pencil,
  Trash2,
  Package,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
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

const ManageProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [stockModal, setStockModal] = useState<number | undefined>(undefined);

  // Load products with pagination and filters
  const loadProducts = async (page = 1, search = "", status = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);

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

  // Initial load and when filters change
  useEffect(() => {
    loadProducts(currentPage, searchTerm, statusFilter);
  }, [currentPage, searchTerm, statusFilter]);

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

  // Apply additional status filter for low/out of stock
  const filtered = products.filter((p) => {
    if (statusFilter === "low" && p.stock >= 5) return false;
    if (statusFilter === "out" && p.stock > 0) return false;
    return true;
  });

  const filterOptions = categories.map((c) => ({ label: c, value: c }));

  const columns: ColumnDef<Product>[] = [
    {
      key: "images",
      header: "Image",
      render: (_v, row) => {
        const imageUrl =
          row.images && row.images.length > 0
            ? row.images[0] // ✅ Use the S3 URL directly (no API_BASE_URL)
            : null;
        return (
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={row.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const icon = document.createElement("div");
                    icon.className =
                      "w-full h-full flex items-center justify-center";
                    icon.innerHTML = `<svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
                    parent.appendChild(icon);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        );
      },
    },
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
            {row.description}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (v) => (
        <span className="inline-flex px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
          {v}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (v) => (
        <div className="font-medium text-gray-900">
          Rs. {Number(v || 0).toFixed(2)}
        </div>
      ),
    },
    {
      key: "retail_price",
      header: "Retail",
      render: (v) => (
        <div className="text-gray-600 text-sm">
          Rs. {Number(v || 0).toFixed(2)}
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (v) => {
        const discount = Number(v || 0);
        return discount > 0 ? (
          <span className="inline-flex px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            {discount}%
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        );
      },
    },
    {
      key: "stock",
      header: "Stock",
      render: (v, row) => {
        const stock = Number(v || 0);
        return (
          <div className="flex flex-col">
            <span
              className={`font-medium ${
                stock === 0
                  ? "text-red-600"
                  : stock < 5
                    ? "text-orange-500"
                    : "text-gray-900"
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
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (_v, row) => {
        const st =
          row.stock === 0
            ? "out-of-stock"
            : row.stock < 5
              ? "low-stock"
              : row.status === "active"
                ? "active"
                : "inactive";
        return <StatusBadge status={st} />;
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
              setEditing(row);
              setModalOpen(true);
            }}
            title="Edit Product"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setDeleteTarget(row);
              setDeleteOpen(true);
            }}
            title="Delete Product"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSave = async (data: Partial<Product>) => {
    try {
      const isEdit = !!(data as any).id;
      const url = isEdit
        ? `${API_BASE_URL}/products/${(data as any).id}`
        : `${API_BASE_URL}/products`;
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      // Reload current page
      await loadProducts(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      console.error("Error saving product:", err);
      alert(err.message || "Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${deleteTarget.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadProducts(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      console.error("Error deleting product:", err);
      alert(err.message || "Failed to delete product");
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Products</h2>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all products in your inventory
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus size={18} /> Add Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => loadProducts(currentPage, searchTerm, statusFilter)}
            className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DynamicTable
          data={filtered}
          columns={columns}
          filterKey="category"
          filterOptions={filterOptions}
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

      <ProductModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        product={editing}
        onSuccess={() => loadProducts(currentPage, searchTerm, statusFilter)}
      />

      <DeleteConfirmationModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Delete Product?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and will remove all associated data.`}
      />

      <StockUpdateModal
        open={!!stockModal}
        onClose={() => setStockModal(undefined)}
        productId={stockModal}
        onUpdated={() => loadProducts(currentPage, searchTerm, statusFilter)}
      />
    </div>
  );
};

export default ManageProducts;
