// src/components/staff/BuyRequestsProd.tsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/apiConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";
import { X, Send, RefreshCw, ShoppingCart, AlertCircle } from "lucide-react";

export type BuyRequestProduct = {
  id: number;
  product_id: string;
  name: string;
  price: number | string;
  stock: number;
  images?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "buy" | "request";
  product: BuyRequestProduct | null;
  defaultQuantity?: number;
  onSuccess?: (result: any) => void;
};

const BuyRequestsProd: React.FC<Props> = ({
  open,
  onClose,
  mode,
  product,
  defaultQuantity = 1,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(defaultQuantity);
  const [guarantor1, setGuarantor1] = useState("");
  const [guarantor2, setGuarantor2] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guarantor options from /active_users
  const [guarantorOptions, setGuarantorOptions] = useState<SelectOption[]>([]);
  const [guarantorsLoading, setGuarantorsLoading] = useState(false);

  /* ---------- Load guarantors when modal opens ---------- */
  useEffect(() => {
    if (!open) return;

    const loadGuarantors = async () => {
      setGuarantorsLoading(true);
      try {
        const params = new URLSearchParams();
        if (user?.role) params.append("role", String(user.role));
        if (user?.bname) params.append("bname", String(user.bname));

        const res = await fetch(
          `${API_BASE_URL}/staff/active_users?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load guarantors");
        const data = await res.json();

        const users: { id: number | string; name: string }[] = data.users || [];

        // Filter out the logged-in user from being their own guarantor
        const options: SelectOption[] = users
          .filter((u) => String(u.id) !== String(user?.id))
          .map((u) => ({
            bcode: String(u.id), // SearchableSelect's "bcode" field — we'll reuse as id
            label: u.name,
            value: String(u.id),
            sub: undefined,
          }));

        setGuarantorOptions(options);
      } catch (err) {
        console.error("Guarantor load error:", err);
        setGuarantorOptions([]);
      } finally {
        setGuarantorsLoading(false);
      }
    };

    loadGuarantors();
  }, [open, user?.id, user?.role, user?.bname]);

  /* ---------- Reset form each open ---------- */
  useEffect(() => {
    if (open) {
      setQuantity(defaultQuantity);
      setGuarantor1("");
      setGuarantor2("");
      setNotes("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultQuantity, product?.id]);

  if (!open || !product) return null;

  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;
  const total = price * quantity;
  const isBuy = mode === "buy";

  const handleSubmit = async () => {
    setError(null);

    if (!user) return setError("You must be logged in.");
    if (!guarantor1) return setError("Please select Guarantor 1");

    if (guarantor1 && guarantor2 && guarantor1 === guarantor2) {
      return setError("Guarantor 1 and Guarantor 2 must be different");
    }
    if (isBuy && quantity > product.stock) {
      return setError(`Only ${product.stock} unit(s) available`);
    }

    setSubmitting(true);
    try {
      const endpoint = isBuy
        ? `${API_BASE_URL}/staff/buy`
        : `${API_BASE_URL}/staff/request`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          staff_user_id: user.id,
          staff_name: user.name,
          quantity,
          guarantor_1: guarantor1 || null,
          guarantor_2: guarantor2 || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit");
      }

      onSuccess?.(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card className="relative w-full max-w-lg bg-white shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isBuy ? "Buy for Myself" : "Request Out-of-Stock Product"}
              </h2>
              <p className="text-sm text-gray-500">
                {isBuy
                  ? "Confirm details and add to your staff cart"
                  : "We'll notify you when this product is back in stock"}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Product summary */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Product</span>
              <span className="font-medium text-gray-900">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Code</span>
              <span className="font-mono text-xs bg-white px-2 py-0.5 rounded">
                {product.product_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unit price</span>
              <span className="font-medium text-gray-900">
                Rs. {price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 font-bold">
              <span className="text-gray-700">Total</span>
              <span className="text-orange-600">Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Guarantor 1 — required */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Guarantor 1 <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1">
              <SearchableSelect
                options={guarantorOptions.filter((o) => o.value !== guarantor2)}
                value={guarantor1}
                onChange={(val) => setGuarantor1(val)}
                placeholder={
                  guarantorsLoading
                    ? "Loading guarantors…"
                    : "Search and select Guarantor 1"
                }
                disabled={submitting || guarantorsLoading}
              />
            </div>
            {!guarantorsLoading && guarantorOptions.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No active users available as guarantors.
              </p>
            )}
          </div>

          {/* Guarantor 2 — optional */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Guarantor 2 (optional)
            </Label>
            <div className="mt-1">
              <SearchableSelect
                options={guarantorOptions.filter((o) => o.value !== guarantor1)}
                value={guarantor2}
                onChange={(val) => setGuarantor2(val)}
                placeholder={
                  guarantorsLoading
                    ? "Loading guarantors…"
                    : "Search and select Guarantor 2"
                }
                disabled={submitting || guarantorsLoading}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Notes (optional)
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements…"
              disabled={submitting}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 text-white ${
                isBuy
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : isBuy ? (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Confirm Buy
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyRequestsProd;
