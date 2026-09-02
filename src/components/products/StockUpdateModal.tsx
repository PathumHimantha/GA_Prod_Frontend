import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/apiConfig";
import { Package, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  productId?: number;
  productName?: string;
  currentStock?: number;
  onUpdated: () => void;
};

const StockUpdateModal: React.FC<Props> = ({
  open,
  onClose,
  productId,
  productName = "",
  currentStock = 0,
  onUpdated,
}) => {
  const [stock, setStock] = useState<number>(currentStock);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStock(currentStock);
      setReason("");
      setError(null);
    }
  }, [open, currentStock]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (stock < 0) {
        setError("Stock cannot be negative");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stock: stock,
            change_type: "adjust",
            change_reason:
              reason || `Stock updated from ${currentStock} to ${stock}`,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update stock");
      }

      const data = await response.json();

      if (data.success) {
        onUpdated();
        onClose();
      } else {
        throw new Error(data.error || "Failed to update stock");
      }
    } catch (err: any) {
      console.error("Error updating stock:", err);
      setError(err.message || "Failed to update stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const changeStock = (amount: number) => {
    setStock((prev) => Math.max(0, prev + amount));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Update Stock
              </h3>
              <p className="text-sm text-gray-500">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Current Stock
            </Label>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {currentStock} units
            </div>
          </div>

          <div>
            <Label
              htmlFor="stock"
              className="text-sm font-medium text-gray-700"
            >
              New Stock Quantity
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeStock(-5)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => changeStock(-1)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                -1
              </button>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
                className="text-center text-lg font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => changeStock(1)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => changeStock(5)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                +5
              </button>
            </div>
          </div>

          <div>
            <Label
              htmlFor="reason"
              className="text-sm font-medium text-gray-700"
            >
              Reason for change (optional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Stock received from supplier, Manual adjustment"
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  Updating...
                </span>
              ) : (
                "Update Stock"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockUpdateModal;
