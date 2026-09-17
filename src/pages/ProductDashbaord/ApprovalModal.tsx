// ApprovalModal.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  X,
  AlertCircle,
  Loader2,
  CheckCircle,
  Edit2,
  Save,
  Package,
  CreditCard,
  Phone,
  MapPin,
  FileText,
  Upload,
  DollarSign,
  Calendar,
} from "lucide-react";

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

type CustomerGroup = {
  customer_nic: string;
  customer_details: any;
  items: CartItem[];
  total_amount: number;
  total_items: number;
};

interface ApprovalModalProps {
  isOpen: boolean;
  selectedGroup: CustomerGroup | null;
  onClose: () => void;
  onApprove: (data: {
    customerAddress: string;
    customerPhone: string;
    periodWeeks: number;
    courierCharge: number;
    purchaseAgreement: File | null;
    purchaseAgreementBack: File | null;
    productIds: number[];
    firstItem: CartItem | null;
    totalAmount: number;
    customer: any;
    userId: string;
    productWeight: number;
  }) => void;
  approving: boolean;
  approvalError: string | null;
  userId: string;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  selectedGroup,
  onClose,
  onApprove,
  approving,
  approvalError,
  userId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [periodWeeks, setPeriodWeeks] = useState(13);
  const [purchaseAgreement, setPurchaseAgreement] = useState<File | null>(null);
  const [purchaseAgreementBack, setPurchaseAgreementBack] =
    useState<File | null>(null);
  const [agreementBackError, setAgreementBackError] = useState<string | null>(
    null,
  );
  const [agreementError, setAgreementError] = useState<string | null>(null);

  // ✅ Initialize state when modal opens or selectedGroup changes
  useEffect(() => {
    if (isOpen && selectedGroup) {
      const customer = selectedGroup.customer_details?.customer;
      setCustomerAddress(customer?.address || "");
      setCustomerPhone(customer?.phone1 || "");
      setIsEditing(false);
      setPurchaseAgreement(null);
      setPurchaseAgreementBack(null);
      setAgreementError(null);
      setAgreementBackError(null);
    }
  }, [isOpen, selectedGroup]);

  const calculateCourierCharge = (weight: number): number => {
    if (weight <= 0) return 0;
    const firstKgRate = 560;
    const additionalKgRate = 180;
    const roundedWeight = Math.ceil(weight);

    if (roundedWeight <= 1) {
      return firstKgRate;
    }
    return firstKgRate + (roundedWeight - 1) * additionalKgRate;
  };

  const calculateTotalWithCourier = (
    totalAmount: number,
    weight: number,
  ): number => {
    const courierCharge = calculateCourierCharge(weight);
    return totalAmount + courierCharge;
  };
  const validateFile = (file: File): string | null => {
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      return "Please upload a PDF or image file";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "File size must be less than 5MB";
    }
    return null;
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];
      if (!validTypes.includes(file.type)) {
        setAgreementError("Please upload a PDF or image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAgreementError("File size must be less than 5MB");
        return;
      }
      setAgreementError(null);
      setPurchaseAgreement(file);
    }
  };
  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setAgreementBackError(err);
      return;
    }
    setAgreementBackError(null);
    setPurchaseAgreementBack(file);
  };
  const handleSubmit = () => {
    if (!purchaseAgreement) {
      setAgreementError("Purchase Agreement is required");
      return;
    }
    if (!selectedGroup) return;

    // ✅ Use the current state values for address and phone
    const firstItem = selectedGroup.items[0];
    const weight = parseFloat(String(firstItem?.product_weight || 0));
    const courierCharge = calculateCourierCharge(weight);
    const customer = selectedGroup.customer_details?.customer;
    const productIds = selectedGroup.items.map((item) => item.id);
    const totalAmount = selectedGroup.total_amount;
    const productWeight = parseFloat((firstItem as any)?.product_weight || 0);

    console.log("Submitting with:", {
      customerAddress,
      customerPhone,
      periodWeeks,
      courierCharge,
      productIds,
      totalAmount,
      productWeight,
    });

    onApprove({
      customerAddress: customerAddress || customer?.address || "",
      customerPhone: customerPhone || customer?.phone1 || "",
      periodWeeks,
      courierCharge,
      purchaseAgreement,
      productIds,
      firstItem,
      totalAmount,
      customer,
      userId,
      productWeight,
    });
  };

  if (!isOpen || !selectedGroup) return null;

  const customer = selectedGroup.customer_details?.customer;
  const firstItem = selectedGroup.items[0];
  const weight = parseFloat(String(firstItem?.product_weight || 0));
  const courierCharge = calculateCourierCharge(weight);
  const totalWithCourier = calculateTotalWithCourier(
    selectedGroup.total_amount,
    weight,
  );
  const weekPayment = totalWithCourier / periodWeeks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-orange-500" />
                Approve Product Loan
              </h2>
              <p className="text-sm text-gray-500">
                Review customer details and confirm loan approval
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              disabled={approving}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Error Message */}
          {approvalError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{approvalError}</p>
            </div>
          )}

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Customer Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="ml-auto text-blue-600 hover:text-blue-700"
                disabled={approving}
              >
                {isEditing ? (
                  <Save className="w-4 h-4 mr-1" />
                ) : (
                  <Edit2 className="w-4 h-4 mr-1" />
                )}
                {isEditing ? "Save" : "Edit"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Customer Name</Label>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-400" />
                  {customer?.name ||
                    customer?.cname ||
                    selectedGroup.customer_nic}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">NIC</Label>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-gray-400" />
                  {selectedGroup.customer_nic}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Phone</Label>
                {isEditing ? (
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1 h-9"
                    placeholder="Enter phone number"
                    disabled={approving}
                  />
                ) : (
                  <p className="text-sm text-gray-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    {customerPhone || customer?.phone1 || "—"}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-500">Center</Label>
                <p className="text-sm text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  {customer?.center || "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-500">Address</Label>
                {isEditing ? (
                  <Input
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="mt-1 h-9"
                    placeholder="Enter full address"
                    disabled={approving}
                  />
                ) : (
                  <p className="text-sm text-gray-700 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    {customerAddress || customer?.address || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Products Summary */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">
                Products ({selectedGroup.items.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
              {selectedGroup.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-sm border-b border-gray-200 last:border-0 pb-1 last:pb-0"
                >
                  <span className="font-medium text-gray-700">
                    {item.product_name}
                  </span>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      × {item.quantity}
                    </Badge>
                    <span className="font-medium text-gray-900">
                      Rs. {parseFloat(item.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-300 font-bold">
                <span>Total</span>
                <span className="text-orange-600">
                  Rs. {selectedGroup.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Courier Charge Calculation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Courier Charge</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Product Weight</Label>
                <p className="text-lg font-bold text-gray-900">
                  {weight.toFixed(2)} kg
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Rate</Label>
                <p className="text-sm text-gray-600">
                  1st kg: Rs. 560
                  <br />
                  Additional: Rs. 180/kg
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Courier Charge</Label>
                <p className="text-lg font-bold text-blue-600">
                  Rs. {courierCharge.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Loan Calculation */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Loan Calculation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Total Amount</Label>
                <p className="text-lg font-bold text-gray-900">
                  Rs. {selectedGroup.total_amount.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Courier Charge</Label>
                <p className="text-md font-semibold text-blue-600">
                  + Rs. {courierCharge.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">
                  Total with Courier
                </Label>
                <p className="text-lg font-bold text-green-600">
                  Rs. {totalWithCourier.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Period (Weeks)</Label>
                <Input
                  type="number"
                  value={periodWeeks}
                  onChange={(e) =>
                    setPeriodWeeks(Math.max(1, parseInt(e.target.value) || 13))
                  }
                  className="w-24 h-9"
                  min="1"
                  max="52"
                  disabled={approving}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Week Payment</Label>
                <p className="text-lg font-bold text-green-600">
                  Rs. {weekPayment.toFixed(2)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Interest Rate</Label>
                <p className="text-sm text-gray-600">0% (No interest)</p>
              </div>
            </div>
          </div>

          {/* Purchase Agreement Upload */}
          {/* Purchase Agreement Upload */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Documents</h3>
              <span className="text-xs text-red-500 ml-1">
                * Front page required
              </span>
            </div>

            <div className="space-y-4">
              {/* ===== FRONT PAGE ===== */}
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Purchase Agreement – Front Page{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 transition-colors bg-white">
                    <Upload className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {purchaseAgreement ? (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            {purchaseAgreement.name}
                          </span>
                        ) : (
                          "Click to upload or drag and drop"
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        PDF, JPG, PNG (Max 5MB)
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="purchase-agreement-front"
                      disabled={approving}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document
                          .getElementById("purchase-agreement-front")
                          ?.click()
                      }
                      className="flex-shrink-0"
                      disabled={approving}
                    >
                      {purchaseAgreement ? "Change" : "Browse"}
                    </Button>
                  </div>
                  {agreementError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {agreementError}
                    </p>
                  )}
                  {purchaseAgreement && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Front page uploaded successfully
                    </p>
                  )}
                </div>
              </div>

              {/* ===== BACK PAGE ===== */}
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  Purchase Agreement – Back Page{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="mt-2">
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 transition-colors bg-white">
                    <Upload className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        {purchaseAgreementBack ? (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            {purchaseAgreementBack.name}
                          </span>
                        ) : (
                          "Click to upload or drag and drop"
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        PDF, JPG, PNG (Max 5MB)
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleBackFileChange}
                      className="hidden"
                      id="purchase-agreement-back"
                      disabled={approving}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document
                          .getElementById("purchase-agreement-back")
                          ?.click()
                      }
                      className="flex-shrink-0"
                      disabled={approving}
                    >
                      {purchaseAgreementBack ? "Change" : "Browse"}
                    </Button>
                  </div>
                  {agreementBackError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {agreementBackError}
                    </p>
                  )}
                  {purchaseAgreementBack && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Back page uploaded successfully
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11"
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={approving || !purchaseAgreement}
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Loan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalModal;
