import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  CreditCard,
  Phone,
  Home,
  MapPin,
  Globe,
  Mail,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Search,
} from "lucide-react";
import { API } from "@/apiConfig";
import { isValidNICFormat, getNICValidationMessage } from "@/lib/NICvalidation";
import { toUpperOnChange } from "@/lib/textUtils";
// Types for Guarantor
export interface GuarantorData {
  name: string;
  nic: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
}

interface GuarantorProps {
  onGuarantorAdded?: () => void;
}

const Guarantor = ({ onGuarantorAdded }: GuarantorProps) => {
  // Customer details (to be entered first)
  const [customerNic, setCustomerNic] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerVerified, setCustomerVerified] = useState(false);
  const [verifyingCustomer, setVerifyingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");
  // ✅ add
  const [customerDetails, setCustomerDetails] = useState<{
    address?: string;
    phone1?: string;
    center?: string;
    centerCode?: string;
    groupName?: string;
    memberNumber?: string;
  } | null>(null);

  // State for multiple guarantors (max 2)
  const [guarantors, setGuarantors] = useState<GuarantorData[]>([
    {
      name: "",
      nic: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
    },
  ]);

  // Validation errors for each field
  const [errors, setErrors] = useState<Record<string, string>>({});

  // NIC validation status for each guarantor
  const [nicStatus, setNicStatus] = useState<
    Record<string, "idle" | "checking" | "ok" | "error">
  >({});
  const [nicMessages, setNicMessages] = useState<Record<string, string>>({});

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Phone validation
  const validatePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length > 0 && digits.length !== 10) {
      return "Must be exactly 10 digits";
    }
    return "";
  };

  // NIC format validation
  const validateNicFormat = (nic: string): boolean => {
    // Sri Lankan NIC format: 9 digits + V/X or 12 digits
    return /^[0-9]{9}[VvXx]$/.test(nic) || /^[0-9]{12}$/.test(nic);
  };

  // Verify customer by NIC
  const verifyCustomer = async () => {
    if (!customerNic.trim()) {
      setCustomerError("Please enter customer NIC");
      return;
    }

    if (!isValidNICFormat(customerNic)) {
      setCustomerError("Invalid NIC format. Use 9 digits + V/X or 12 digits");
      return;
    }
    setVerifyingCustomer(true);
    setCustomerError("");

    try {
      const response = await fetch(
        `${API.loan.verifyCustomer}?nic=${customerNic}`,
      );
      const data = await response.json();

      if (!response.ok || !data.customerFound) {
        throw new Error(data.error || "Customer not found");
      }

      // ✅ pull from data.customer, not top-level
      setCustomerName(data.customer?.customerName || "");
      setCustomerDetails({
        address: data.customer?.address,
        phone1: data.customer?.phone1,
        center: data.customer?.center,
        centerCode: data.customer?.centerCode,
        groupName: data.customer?.groupName,
        memberNumber: data.customer?.memberNumber,
      });
      setCustomerVerified(true);
      setCustomerError("");
    } catch (error: any) {
      setCustomerError(error.message || "Failed to verify customer");
      setCustomerVerified(false);
      setCustomerDetails(null);
    } finally {
      setVerifyingCustomer(false);
    }
  };
  // Handle phone change
  const handlePhoneChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const updated = [...guarantors];
    updated[index].phone = digits;
    setGuarantors(updated);

    const error = validatePhone(digits);
    if (error) {
      setErrors((prev) => ({ ...prev, [`phone_${index}`]: error }));
    } else {
      const newErrors = { ...errors };
      delete newErrors[`phone_${index}`];
      setErrors(newErrors);
    }
  };

  // Handle NIC change with validation
  const handleNicChange = (index: number, value: string) => {
    // Block input beyond 12 chars
    if (value.length > 12) return;

    const updated = [...guarantors];
    updated[index].nic = value;
    setGuarantors(updated);

    // Clear any form errors for this field
    if (errors[`nic_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`nic_${index}`];
      setErrors(newErrors);
    }

    // ── Local format validation ──
    const formatError = getNICValidationMessage(value);
    if (formatError) {
      setNicStatus((prev) => ({ ...prev, [`nic_${index}`]: "error" }));
      setNicMessages((prev) => ({ ...prev, [`nic_${index}`]: formatError }));
      return;
    }

    // ── Still typing — not complete yet ──
    if (!isValidNICFormat(value)) {
      setNicStatus((prev) => ({ ...prev, [`nic_${index}`]: "idle" }));
      setNicMessages((prev) => ({ ...prev, [`nic_${index}`]: "" }));
      return;
    }

    // ── Complete and valid format ──
    setNicStatus((prev) => ({ ...prev, [`nic_${index}`]: "ok" }));
    setNicMessages((prev) => ({
      ...prev,
      [`nic_${index}`]: "NIC format is valid",
    }));
  };

  // Add new guarantor (max 2)
  const addGuarantor = () => {
    if (guarantors.length < 2) {
      setGuarantors([
        ...guarantors,
        {
          name: "",
          nic: "",
          street: "",
          city: "",
          state: "",
          postalCode: "",
          phone: "",
        },
      ]);
    }
  };

  // Remove guarantor
  const removeGuarantor = (index: number) => {
    if (guarantors.length > 1) {
      const updated = guarantors.filter((_, i) => i !== index);
      setGuarantors(updated);

      // Clean up errors and status for removed guarantor
      const newErrors = { ...errors };
      const newNicStatus = { ...nicStatus };
      const newNicMessages = { ...nicMessages };

      Object.keys(newErrors).forEach((key) => {
        if (key.endsWith(`_${index}`)) delete newErrors[key];
      });
      Object.keys(newNicStatus).forEach((key) => {
        if (key.endsWith(`_${index}`)) delete newNicStatus[key];
      });
      Object.keys(newNicMessages).forEach((key) => {
        if (key.endsWith(`_${index}`)) delete newNicMessages[key];
      });

      setErrors(newErrors);
      setNicStatus(newNicStatus);
      setNicMessages(newNicMessages);
    }
  };

  // Validate all fields before submit
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerVerified) {
      newErrors.customer = "Please verify customer NIC first";
    }

    guarantors.forEach((g, index) => {
      if (!g.name.trim())
        newErrors[`name_${index}`] = "Guarantor name is required";
      if (!g.nic.trim()) {
        newErrors[`nic_${index}`] = "Guarantor NIC is required";
      } else if (!isValidNICFormat(g.nic)) {
        newErrors[`nic_${index}`] = "Invalid NIC format";
      }
      if (!g.street.trim())
        newErrors[`street_${index}`] = "Street address is required";
      // if (!g.city.trim()) newErrors[`city_${index}`] = "City is required";
      // if (!g.state.trim()) newErrors[`state_${index}`] = "State is required";
      // if (!g.postalCode.trim())
      //   newErrors[`postal_${index}`] = "Postal code is required";

      const phoneError = validatePhone(g.phone);
      if (phoneError) {
        newErrors[`phone_${index}`] = phoneError;
      } else if (!g.phone.trim()) {
        newErrors[`phone_${index}`] = "Phone number is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit guarantors
  const handleSubmit = async () => {
    if (!validateForm()) {
      setSubmitError("Please fix all errors before submitting");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(null);

    try {
      // Submit each guarantor
      for (let i = 0; i < guarantors.length; i++) {
        const guarantor = guarantors[i];

        const formData = new URLSearchParams();
        formData.append("customerNic", customerNic);
        formData.append("customerName", customerName);
        formData.append("guarantorName", guarantor.name);
        formData.append("guarantorNic", guarantor.nic);
        formData.append("street", guarantor.street);
        formData.append("city", guarantor.city);
        formData.append("state", guarantor.state);
        formData.append("postalCode", guarantor.postalCode);
        formData.append("guarantorPhone", guarantor.phone);

        const response = await fetch(API.loan.addGuarantor, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `Failed to add guarantor ${i + 1}`);
        }
      }

      setSubmitSuccess(`Successfully added ${guarantors.length} guarantor(s)`);
      onGuarantorAdded?.();

      // Reset form after successful submission
      setCustomerNic("");
      setCustomerName("");
      setCustomerVerified(false);
      setCustomerDetails(null);
      setGuarantors([
        {
          name: "",
          nic: "",
          street: "",
          city: "",
          state: "",
          postalCode: "",
          phone: "",
        },
      ]);
    } catch (error: any) {
      setSubmitError(error.message || "Failed to add guarantors");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-foreground">
              Add Guarantors
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              First verify customer, then add up to 2 guarantors
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{submitSuccess}</p>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Customer Verification Section */}
        <div className="mb-8 p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Customer Verification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Customer NIC <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={customerNic}
                  onChange={(e) => {
                    setCustomerNic(e.target.value);
                    setCustomerVerified(false);
                    setCustomerError("");
                    setCustomerDetails(null);
                  }}
                  placeholder="Enter customer NIC (e.g., 123456789V)"
                  className={`pl-9 h-12 bg-background border-border pr-24 ${
                    customerError
                      ? "border-destructive"
                      : customerVerified
                        ? "border-green-400"
                        : ""
                  }`}
                  disabled={customerVerified}
                />
                <Button
                  type="button"
                  onClick={verifyCustomer}
                  disabled={
                    verifyingCustomer || customerVerified || !customerNic
                  }
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
                >
                  {verifyingCustomer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : customerVerified ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {customerError && (
                <p className="text-xs text-destructive">{customerError}</p>
              )}
              {customerVerified && customerName && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Customer verified: {customerName}
                </p>
              )}
            </div>

            {customerName && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Customer Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    value={customerName}
                    readOnly
                    className="pl-9 h-12 bg-muted/50 border-border"
                  />
                </div>
              </div>
            )}

            {customerVerified && customerDetails && (
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white border border-blue-100 rounded-lg mt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Center</p>
                  <p className="text-sm font-medium text-foreground">
                    {customerDetails.center} ({customerDetails.centerCode})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Group / Member No
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {customerDetails.groupName} — {customerDetails.memberNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">
                    {customerDetails.phone1 || "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium text-foreground">
                    {customerDetails.address || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Guarantor Button */}
        {customerVerified && guarantors.length < 2 && (
          <Button
            type="button"
            onClick={addGuarantor}
            variant="outline"
            className="mb-6 w-full sm:w-auto border-dashed border-2 hover:border-primary hover:bg-primary/5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Guarantor ({guarantors.length}/2)
          </Button>
        )}

        {/* Guarantors List */}
        {customerVerified ? (
          <div className="space-y-8">
            {guarantors.map((guarantor, index) => (
              <div key={index} className="relative">
                {/* Remove button (if more than 1) */}
                {guarantors.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGuarantor(index)}
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}

                <div className="p-6 border border-border rounded-xl bg-card/50">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    Guarantor {index + 1}
                  </h3>

                  {/* Personal Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Guarantor Name{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            value={guarantor.name}
                            onChange={(e) => {
                              toUpperOnChange(e, (val) => {
                                const updated = [...guarantors];
                                updated[index].name = val;
                                setGuarantors(updated);
                                if (errors[`name_${index}`]) {
                                  const newErrors = { ...errors };
                                  delete newErrors[`name_${index}`];
                                  setErrors(newErrors);
                                }
                              });
                            }}
                            placeholder="Enter guarantor name"
                            className={`pl-9 h-12 bg-background border-border ${
                              errors[`name_${index}`]
                                ? "border-destructive"
                                : ""
                            }`}
                          />
                        </div>
                        {errors[`name_${index}`] && (
                          <p className="text-xs text-destructive">
                            {errors[`name_${index}`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Guarantor NIC{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            value={guarantor.nic}
                            onChange={(e) =>
                              handleNicChange(index, e.target.value)
                            }
                            placeholder="Enter NIC (e.g., 123456789V)"
                            className={`pl-9 h-12 bg-background border-border pr-10 ${
                              errors[`nic_${index}`]
                                ? "border-destructive"
                                : nicStatus[`nic_${index}`] === "ok"
                                  ? "border-green-400"
                                  : ""
                            }`}
                          />
                          {nicStatus[`nic_${index}`] === "checking" && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                          )}
                          {nicStatus[`nic_${index}`] === "ok" && (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                          )}
                          {nicStatus[`nic_${index}`] === "error" && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                          )}
                        </div>
                        {errors[`nic_${index}`] && (
                          <p className="text-xs text-destructive">
                            {errors[`nic_${index}`]}
                          </p>
                        )}
                        {nicMessages[`nic_${index}`] && (
                          <p
                            className={`text-xs flex items-center gap-1 ${
                              nicStatus[`nic_${index}`] === "error"
                                ? "text-destructive"
                                : "text-green-600"
                            }`}
                          >
                            {nicStatus[`nic_${index}`] === "error" ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {nicMessages[`nic_${index}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Address Fields (Street, City, State, Postal Code) */}
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">
                        Address Details{" "}
                        <span className="text-destructive">*</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            House No
                          </Label>
                          <div className="relative">
                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              value={guarantor.street}
                              onChange={(e) => {
                                toUpperOnChange(e, (val) => {
                                  const updated = [...guarantors];
                                  updated[index].street = val;
                                  setGuarantors(updated);
                                  if (errors[`street_${index}`]) {
                                    const newErrors = { ...errors };
                                    delete newErrors[`street_${index}`];
                                    setErrors(newErrors);
                                  }
                                });
                              }}
                              placeholder=" House No"
                              className={`pl-9 h-12 bg-background border-border ${
                                errors[`street_${index}`]
                                  ? "border-destructive"
                                  : ""
                              }`}
                            />
                          </div>
                          {errors[`street_${index}`] && (
                            <p className="text-xs text-destructive">
                              {errors[`street_${index}`]}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Address 1
                          </Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              value={guarantor.city}
                              onChange={(e) => {
                                toUpperOnChange(e, (val) => {
                                  const updated = [...guarantors];
                                  updated[index].city = val;
                                  setGuarantors(updated);
                                  if (errors[`city_${index}`]) {
                                    const newErrors = { ...errors };
                                    delete newErrors[`city_${index}`];
                                    setErrors(newErrors);
                                  }
                                });
                              }}
                              placeholder="Address 1"
                              className={`pl-9 h-12 bg-background border-border ${
                                errors[`city_${index}`]
                                  ? "border-destructive"
                                  : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Address 2
                          </Label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              value={guarantor.state}
                              onChange={(e) => {
                                toUpperOnChange(e, (val) => {
                                  const updated = [...guarantors];
                                  updated[index].state = val;
                                  setGuarantors(updated);
                                  if (errors[`state_${index}`]) {
                                    const newErrors = { ...errors };
                                    delete newErrors[`state_${index}`];
                                    setErrors(newErrors);
                                  }
                                });
                              }}
                              placeholder="Address 2"
                              className={`pl-9 h-12 bg-background border-border ${
                                errors[`state_${index}`]
                                  ? "border-destructive"
                                  : ""
                              }`}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Address 3
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              value={guarantor.postalCode}
                              onChange={(e) => {
                                const updated = [...guarantors];
                                updated[index].postalCode = e.target.value;
                                setGuarantors(updated);
                                if (errors[`postal_${index}`]) {
                                  const newErrors = { ...errors };
                                  delete newErrors[`postal_${index}`];
                                  setErrors(newErrors);
                                }
                              }}
                              placeholder="Address 3"
                              className={`pl-9 h-12 bg-background border-border ${
                                errors[`postal_${index}`]
                                  ? "border-destructive"
                                  : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Phone Number{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            type="tel"
                            value={guarantor.phone}
                            onChange={(e) =>
                              handlePhoneChange(index, e.target.value)
                            }
                            placeholder="Enter 10-digit number"
                            className={`pl-9 h-12 bg-background border-border ${
                              errors[`phone_${index}`]
                                ? "border-destructive"
                                : ""
                            }`}
                            maxLength={10}
                          />
                        </div>
                        {errors[`phone_${index}`] && (
                          <p className="text-xs text-destructive">
                            {errors[`phone_${index}`]}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {guarantor.phone.length}/10 digits
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <div className="mt-8 flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !customerVerified}
                size="lg"
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding Guarantor(s)...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Add Guarantor{guarantors.length > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed rounded-xl">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">
              Verify Customer First
            </h3>
            <p className="text-xs text-muted-foreground">
              Enter and verify the customer NIC above to add guarantors
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Guarantor;
