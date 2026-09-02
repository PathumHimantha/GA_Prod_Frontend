import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FileUploadField from "../FileUploadField";
import { API_BASE_URL } from "@/apiConfig";

type Product = {
  id?: string;
  product_id?: string;
  category: string;
  name: string;
  description: string;
  price: number;
  retail_price: number;
  discount: number;
  stock?: number;
  status?: string;
  images: string[];
  product_weight?: number; // New field
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave?: (p: Partial<Product>) => Promise<void> | void;
  product?: Product | null;
  onSuccess?: () => void;
};

const ProductModal: React.FC<Props> = ({
  open,
  onClose,
  onSave,
  product,
  onSuccess,
}) => {
  const [form, setForm] = useState<Partial<Product>>({
    product_id: "",
    category: "",
    name: "",
    description: "",
    price: 0,
    retail_price: 0,
    discount: 0,
    stock: 0,
    status: "active",
    images: [],
    product_weight: 0, // New field
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setForm({
        product_id: product.product_id || "",
        category: product.category || "",
        name: product.name || "",
        description: product.description || "",
        price: product.price || 0,
        retail_price: product.retail_price || 0,
        discount: product.discount || 0,
        stock: product.stock || 0,
        status: product.status || "active",
        images: product.images || [],
        product_weight: product.product_weight || 0,
      });
      setExistingImages(product.images || []);
    } else {
      setForm({
        product_id: "",
        category: "",
        name: "",
        description: "",
        price: 0,
        retail_price: 0,
        discount: 0,
        stock: 0,
        status: "active",
        images: [],
        product_weight: 0,
      });
      setExistingImages([]);
      setUploadedFiles([]);
    }
    setError(null);
  }, [product, open]);

  if (!open) return null;

  const handleChange = (k: string, v: any) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleRemoveExistingImage = (index: number) => {
    const updatedImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(updatedImages);
    setForm((s) => ({ ...s, images: updatedImages }));
  };

  // Upload images to server with category and product_id
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();

    formData.append("category", form.category || "uncategorized");
    formData.append("product_id", form.product_id || "temp");

    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/products/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload images");
      }

      const data = await response.json();
      return data.imageUrls || [];
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!form.product_id) {
        setError("Please provide Product ID");
        setLoading(false);
        return;
      }
      if (!form.category) {
        setError("Please provide Category");
        setLoading(false);
        return;
      }
      if (!form.name) {
        setError("Please provide Product Name");
        setLoading(false);
        return;
      }
      if (!form.price || form.price <= 0) {
        setError("Please provide a valid Price");
        setLoading(false);
        return;
      }
      if (!form.retail_price || form.retail_price <= 0) {
        setError("Please provide a valid Retail Price");
        setLoading(false);
        return;
      }

      // Upload new images first (if any)
      let uploadedImageUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        try {
          uploadedImageUrls = await uploadImages(uploadedFiles);
        } catch (uploadError: any) {
          setError(
            uploadError.message || "Failed to upload images. Please try again.",
          );
          setLoading(false);
          return;
        }
      }

      // Combine existing images with newly uploaded ones
      const allImages = [...existingImages, ...uploadedImageUrls];

      // Prepare product data
      const productData = {
        product_id: form.product_id,
        category: form.category,
        name: form.name,
        description: form.description || "",
        price: form.price,
        retail_price: form.retail_price,
        discount: form.discount || 0,
        images: allImages,
        stock: form.stock || 0,
        status: form.status || "active",
        product_weight: form.product_weight || 0, // New field
      };

      // Determine if creating or updating
      const isEdit = !!product;
      const url = isEdit
        ? `${API_BASE_URL}/products/${product.id}`
        : `${API_BASE_URL}/products`;
      const method = isEdit ? "PUT" : "POST";

      // Send product data to backend
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      const result = await response.json();

      // Call onSave if provided
      if (onSave) {
        await onSave(result.data || productData);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (err: any) {
      console.error("Error saving product:", err);
      setError(err.message || "Failed to save product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-lg font-semibold mb-4">
          {product ? "Edit Product" : "Add Product"}
        </h3>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Product ID */}
          <div>
            <Label>
              Product ID <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.product_id || ""}
              onChange={(e) => handleChange("product_id", e.target.value)}
              placeholder="e.g., PRD-001"
              disabled={!!product || loading}
            />
          </div>

          {/* Category */}
          <div>
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.category || ""}
              onChange={(e) => handleChange("category", e.target.value)}
              placeholder="e.g., Electronics"
              disabled={loading}
            />
          </div>

          {/* Product Name */}
          <div>
            <Label>
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Product name"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Product description"
              rows={4}
              className="resize-y"
              disabled={loading}
            />
          </div>

          {/* Price */}
          <div>
            <Label>
              Price <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={form.price || 0}
              onChange={(e) => handleChange("price", Number(e.target.value))}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          {/* Retail Price */}
          <div>
            <Label>
              Retail Price <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={form.retail_price || 0}
              onChange={(e) =>
                handleChange("retail_price", Number(e.target.value))
              }
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          {/* Discount */}
          <div>
            <Label>Discount (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.discount || 0}
              onChange={(e) => handleChange("discount", Number(e.target.value))}
              placeholder="0"
              disabled={loading}
            />
          </div>

          {/* Stock */}
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              min="0"
              value={form.stock || 0}
              onChange={(e) => handleChange("stock", Number(e.target.value))}
              placeholder="0"
              disabled={loading}
            />
          </div>

          {/* Product Weight - New Field */}
          <div>
            <Label>Product Weight (kg)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.product_weight || 0}
              onChange={(e) =>
                handleChange("product_weight", Number(e.target.value))
              }
              placeholder="0.00"
              disabled={loading}
            />
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="mt-4">
          <FileUploadField
            id="product-images"
            label="Product Images"
            multiple={true}
            maxFiles={10}
            existingImages={existingImages}
            onRemoveExisting={handleRemoveExistingImage}
            onFiles={(files) => setUploadedFiles(files)}
            disabled={loading}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            type="button"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                Saving...
              </span>
            ) : product ? (
              "Update Product"
            ) : (
              "Add Product"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductModal;
