import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  User,
  Search,
  Loader2,
  AlertCircle,
  Printer,
  Calendar,
  Landmark,
  CheckCircle2,
  Package,
  Phone,
} from "lucide-react";
import { API_BASE_URL, APP_API_BASE_URL } from "@/apiConfig";
import { isValidNICFormat, getNICValidationMessage } from "@/lib/NICvalidation";
import { BANKS } from "@/lib/bank";
import SearchableSelect, { SelectOption } from "@/components/SearchableSelect";

const isWeekend = (dateStr: string) => {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

const getTodayStr = () => new Date().toISOString().split("T")[0];

// Product interface matching API response
interface Product {
  id: number;
  product_id: string;
  category: string;
  name: string;
  description: string;
  price: string;
  retail_price: string;
  discount: string;
  stock: number;
  status: string;
  images: string[];
  created_at: string;
  updated_at: string;
  product_weight: string;
  courier_fee: string;
}

const emptyForm = {
  date: "",
  cname: "",
  address: "",
  nic: "",
  phone: "", // ✅ Add phone field
  loan_amount: "",
  interest: "30",
  period: "13",
  week_payment: "",
  grantor1_name: "",
  grantor1_nic: "",
  grantor1_address: "",
  grantor2_name: "",
  grantor2_nic: "",
  grantor2_address: "",
  bank_name: "",
  bank_branch: "",
  account_name: "",
  account_number: "",
  business_type: "",
  product_id: "",
  product_name: "",
  product_price: "",
  product_code: "",
  courier_fee: "",
};

const PrintLoanAgreementDoc = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("new");

  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [newNicError, setNewNicError] = useState("");
  const [grantor1NicError, setGrantor1NicError] = useState("");
  const [grantor2NicError, setGrantor2NicError] = useState("");
  const [printPages, setPrintPages] = useState({
    sinhala1: true,
    sinhala2: false,
  });

  // Product states
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const calculateDocumentFee = (totalAmount: number | string) => {
    const amount = parseFloat(String(totalAmount)) || 0;
    return amount >= 15000 ? 1000 : 500;
  };
  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();

      if (data.success && data.data) {
        const productOptions = data.data.map((p: Product) => ({
          label: `${p.name} (${p.product_id}) - Rs. ${parseFloat(p.price).toLocaleString()}`,
          value: p.product_id,
          sub: p.category,
        }));
        setProducts(productOptions);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    fetchProductDetails(productId);
  };

  const fetchProductDetails = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();

      if (data.success && data.data) {
        const product = data.data.find(
          (p: Product) => p.product_id === productId,
        );

        if (product) {
          const price = parseFloat(product.price);

          // ✅ Compute fees
          const docFee = calculateDocumentFee(price);
          const courierFee = parseFloat(product.courier_fee || "0") || 0;

          setForm((prev) => ({
            ...prev,
            product_id: product.product_id,
            product_name: product.name,
            product_price: product.price,
            loan_amount: product.price,
            business_type: product.category || "",
            document_fee: String(docFee), // ✅ new
            courier_fee: String(courierFee), // ✅ new
          }));

          setSelectedProduct(product);
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));
  };

  // ✅ Phone handler
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, phone: digits }));
  };

  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    return maxDate.toISOString().split("T")[0];
  };

  const handleDateChange = (value: string) => {
    const today = getTodayStr();
    const maxDate = getMaxDate();

    if (value < today) {
      setFormError("Cannot select past dates.");
      return;
    }

    if (value > maxDate) {
      setFormError("Cannot select dates more than 1 week in advance.");
      return;
    }

    if (isWeekend(value)) {
      setFormError("Weekends (Saturday/Sunday) are not allowed.");
      return;
    }

    setFormError("");
    setForm((prev) => ({ ...prev, date: value }));
  };

  const handleNicInput = (
    field: "nic" | "grantor1_nic" | "grantor2_nic",
    value: string,
    setError: (msg: string) => void,
  ) => {
    if (value.length > 12) return;
    setForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));
    setError(getNICValidationMessage(value) || "");
  };

  const validate = () => {
    if (!form.date) return "Please select a date.";
    if (!form.cname.trim()) return "Customer name is required.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.nic.trim()) return "NIC is required.";
    if (!isValidNICFormat(form.nic)) return "Invalid customer NIC format.";
    if (!form.phone.trim() || form.phone.length !== 10) {
      return "Valid 10-digit phone number is required.";
    }
    if (!form.loan_amount || Number(form.loan_amount) <= 0)
      return "Please select a product.";
    return "";
  };

  const printAgreement = (template: "S1" | "S2") => {
    const win = window.open(
      `/templates/PLoanAgreement${template}.html`,
      "_blank",
      "width=1100,height=750",
    );
    if (!win) return;

    win.addEventListener("load", () => {
      const d = new Date(form.date);
      const day = d.getDate().toString().padStart(2, "0");
      const month = d.toLocaleString("en-LK", { month: "long" });
      const year = d.getFullYear().toString();

      const amount = Number(form.loan_amount);
      const interest = 0;
      const period = 13;
      const totalInterest = (amount * interest) / 100;
      const fullLoan = amount + totalInterest;
      const weekPayment = parseFloat((amount / period).toFixed(2));

      // ✅ Use phone from form
      const phone = form.phone || "";
      const goodsDescription =
        form.product_name || form.business_type || "Consumer Goods";

      const replacements: Record<string, string> = {
        "{{DAY}}": day,
        "{{MONTH}}": month,
        "{{YEAR}}": year,
        "{{DATE}}": form.date,
        "{{CUSTOMER_NAME}}": form.cname,
        "{{ADDRESS}}": form.address,
        "{{CUSTOMER_NIC}}": form.nic,
        "{{PHONE}}": phone,
        "{{LOAN_AMOUNT}}": amount.toLocaleString("en-LK"),
        "{{LOAN_AMOUNT_WORDS}}": amountToWords(amount),
        "{{LOAN_PURPOSE}}": form.business_type || "",
        "{{GOODS_DESCRIPTION}}": goodsDescription,
        "{{PRODUCT_ID}}": form.product_id || "",
        "{{INTEREST_RATE}}": `${interest}`,
        "{{TOTAL_INTEREST}}": totalInterest.toLocaleString("en-LK"),
        "{{FULL_LOAN}}": fullLoan.toLocaleString("en-LK"),
        "{{PERIOD}}": period.toString(),
        "{{WEEK_PAYMENT}}": weekPayment.toLocaleString("en-LK"),
        "{{PAYMENT_DAY}}": d.toLocaleString("en-LK", { weekday: "long" }),
        "{{START_DATE}}": form.date,
        "{{END_DATE}}": (form as any).due_date || "",
        "{{GRANTOR1_NAME}}": form.grantor1_name || "",
        "{{GRANTOR1_NIC}}": form.grantor1_nic || "",
        "{{GRANTOR1_ADDRESS}}": (form as any).grantor1_address || "",
        "{{GRANTOR2_NAME}}": form.grantor2_name || "",
        "{{GRANTOR2_NIC}}": form.grantor2_nic || "",
        "{{GRANTOR2_ADDRESS}}": (form as any).grantor2_address || "",
        "{{BANK_NAME}}": form.bank_name || "",
        "{{BRANCH_NAME}}": form.bank_branch || "",
        "{{ACC_NAME}}": form.account_name || "",
        "{{ACC_NO}}": form.account_number || "",
        "{{EX_NAME}}": user?.name || "",
        "{{EX_DESIGNATION}}": user?.status || "",
        // ✅ Fees
        "{{DOCUMENT_FEE}}": parseFloat(form.document_fee || "0").toLocaleString(
          "en-LK",
        ),
        "{{COURIER_FEE}}": parseFloat(form.courier_fee || "0").toLocaleString(
          "en-LK",
        ),
      };

      const doc = win.document;
      let html = doc.documentElement.innerHTML;
      Object.entries(replacements).forEach(([k, v]) => {
        html = html.split(k).join(v);
      });
      doc.documentElement.innerHTML = html;
      setTimeout(() => win.print(), 800);
    });
  };

  const handlePrint = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    if (!printPages.sinhala1 && !printPages.sinhala2) {
      setFormError("Please select at least one page to print.");
      return;
    }
    setFormError("");

    const queue: Array<"S1" | "S2"> = [];
    if (printPages.sinhala1) queue.push("S1");
    if (printPages.sinhala2) queue.push("S2");

    queue.forEach((template, i) => {
      setTimeout(() => printAgreement(template), i * 900);
    });
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchSuccess("");

    try {
      const bcode = user?.bcode;
      const res = await fetch(
        `${APP_API_BASE_URL}/api/docprint/get_customer_by_loan_to_docprint?term=${encodeURIComponent(searchTerm)}&bcode=${bcode}`,
      );
      const data = await res.json();

      if (data?.success && data?.customer) {
        const c = data.customer;
        setForm({
          date: getTodayStr() || "",
          cname: c.cname || "",
          address: c.address || "",
          nic: c.nic || "",
          phone: c.phone1 || "", // ✅ Set phone from API response
          loan_amount: c.loan_amount?.toString() || "",
          interest: "30",
          period: "13",
          week_payment: c.week_payment?.toString() || "",
          grantor1_name: c.guarantors?.[0]?.gname || "",
          grantor1_nic: c.guarantors?.[0]?.gNic || "",
          grantor2_name: c.guarantors?.[1]?.gname || "",
          grantor2_nic: c.guarantors?.[1]?.gNic || "",
          bank_name: "",
          bank_branch: "",
          account_name: "",
          account_number: "",
          business_type: c.business_type || "",
          product_id: "",
          product_name: "",
          product_price: "",
          product_code: "",
        });
        setFormError("");
        setNewNicError("");
        setGrantor1NicError("");
        setGrantor2NicError("");
        setSearchSuccess(`${c.cname} (${c.customer_code})`);
        setActiveTab("new");
      } else {
        setSearchError(
          "No customer found. Please check the NIC or customer code.",
        );
      }
    } catch {
      setSearchError("Error connecting to server.");
    } finally {
      setSearching(false);
    }
  };

  function amountToWords(amount: number): string {
    if (!amount || isNaN(amount)) return "";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const below1000 = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + below1000(n % 100) : "")
      );
    };

    let n = Math.floor(amount);
    if (n === 0) return "Zero Rupees Only";

    let result = "";
    if (n >= 1000000) {
      result += below1000(Math.floor(n / 1000000)) + " Million ";
      n %= 1000000;
    }
    if (n >= 1000) {
      result += below1000(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    if (n > 0) {
      result += below1000(n);
    }

    return result.trim().toUpperCase() + " RUPEES ONLY";
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 py-6 mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FAA300]" />
            කුලියට විකිණීමේ ගිවිසුම (Hire Purchase Agreement)
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="new" className="flex-1">
              New Customer
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">
              Existing Customer
            </TabsTrigger>
          </TabsList>

          {/* ── FORM TAB ── */}
          <TabsContent value="new">
            <Card>
              <CardHeader className="bg-gray-50 border-b py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  {searchSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">
                        Loaded: {searchSuccess}
                      </span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" /> Customer Details
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Row 1: Date + Customer Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-bold mb-1 block text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date
                    </Label>
                    <Input
                      type="date"
                      min={getTodayStr()}
                      max={getMaxDate()}
                      value={form.date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="text-sm"
                    />
                    {form.date && isWeekend(form.date) && (
                      <p className="text-xs text-red-500 mt-1">
                        Weekends (Saturday/Sunday) are not allowed.
                      </p>
                    )}
                    {form.date && form.date > getMaxDate() && (
                      <p className="text-xs text-red-500 mt-1">
                        Cannot select dates more than 1 week in advance.
                      </p>
                    )}
                    {form.date && form.date < getTodayStr() && (
                      <p className="text-xs text-red-500 mt-1">
                        Cannot select past dates.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="font-bold mb-1 block text-xs">
                      Customer Name
                    </Label>
                    <Input
                      value={form.cname}
                      onChange={(e) => handleChange("cname", e.target.value)}
                      placeholder="FULL NAME"
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Row 2: NIC + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-bold mb-1 block text-xs">NIC</Label>
                    <Input
                      value={form.nic}
                      onChange={(e) =>
                        handleNicInput("nic", e.target.value, setNewNicError)
                      }
                      placeholder="NIC NUMBER"
                      maxLength={12}
                      className={`text-sm ${newNicError ? "border-destructive" : isValidNICFormat(form.nic) ? "border-green-400" : ""}`}
                    />
                    {newNicError && (
                      <p className="text-xs text-red-500 mt-1">{newNicError}</p>
                    )}
                  </div>
                  <div>
                    <Label className="font-bold mb-1 block text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-500" /> Phone
                    </Label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="0712345678"
                      className="text-sm"
                      maxLength={10}
                    />
                    {form.phone &&
                      form.phone.length > 0 &&
                      form.phone.length !== 10 && (
                        <p className="text-xs text-red-500 mt-1">
                          Must be 10 digits
                        </p>
                      )}
                  </div>
                </div>

                {/* Row 3: Address */}
                <div>
                  <Label className="font-bold mb-1 block text-xs">
                    Address
                  </Label>
                  <Input
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="ADDRESS"
                    className="text-sm"
                  />
                </div>

                {/* Product Selection */}
                <div>
                  <Label className="font-bold mb-1 block text-xs flex items-center gap-1">
                    <Package className="w-3 h-3" /> Select Product / භාණ්ඩය
                    තෝරන්න
                  </Label>
                  <SearchableSelect
                    options={products}
                    value={form.product_id}
                    onChange={handleProductSelect}
                    placeholder={
                      loadingProducts
                        ? "Loading products..."
                        : "Search and select a product..."
                    }
                    disabled={loadingProducts}
                  />
                  {selectedProduct && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">
                            Product:
                          </span>
                          <span className="font-medium">
                            {selectedProduct.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">
                            Code:
                          </span>
                          <span className="font-medium">
                            {selectedProduct.product_id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">
                            Category:
                          </span>
                          <span className="font-medium">
                            {selectedProduct.category}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">
                            Price:
                          </span>
                          <span className="font-bold text-green-600">
                            Rs.{" "}
                            {parseFloat(selectedProduct.price).toLocaleString()}
                          </span>
                        </div>
                        {/* ✅ Fees */}
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">
                            Document Fee:
                          </span>
                          <span className="font-medium text-amber-600">
                            Rs.{" "}
                            {parseFloat(
                              form.document_fee || "0",
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-600">
                            Courier Fee:
                          </span>
                          <span className="font-medium text-amber-600">
                            Rs.{" "}
                            {parseFloat(
                              form.courier_fee || "0",
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guarantors */}
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Guarantors / ඇපකරුවන්
                  </p>

                  <div className="mb-3">
                    <p className="text-xs text-gray-400 font-medium mb-2">
                      Grantor 1 / 1 වන ඇපකරු
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="font-bold mb-1 block text-xs">
                          Name
                        </Label>
                        <Input
                          value={form.grantor1_name}
                          onChange={(e) =>
                            handleChange("grantor1_name", e.target.value)
                          }
                          placeholder="GRANTOR 1 NAME"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="font-bold mb-1 block text-xs">
                          NIC
                        </Label>
                        <Input
                          value={form.grantor1_nic}
                          onChange={(e) =>
                            handleNicInput(
                              "grantor1_nic",
                              e.target.value,
                              setGrantor1NicError,
                            )
                          }
                          placeholder="GRANTOR 1 NIC"
                          maxLength={12}
                          className={`text-sm ${grantor1NicError ? "border-destructive" : isValidNICFormat(form.grantor1_nic) ? "border-green-400" : ""}`}
                        />
                        {grantor1NicError && (
                          <p className="text-xs text-red-500 mt-1">
                            {grantor1NicError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="font-bold mb-1 block text-xs">
                        Address
                      </Label>
                      <Input
                        value={(form as any).grantor1_address}
                        onChange={(e) =>
                          handleChange("grantor1_address", e.target.value)
                        }
                        placeholder="GRANTOR 1 ADDRESS"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">
                      Grantor 2 / 2 වන ඇපකරු
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="font-bold mb-1 block text-xs">
                          Name
                        </Label>
                        <Input
                          value={form.grantor2_name}
                          onChange={(e) =>
                            handleChange("grantor2_name", e.target.value)
                          }
                          placeholder="GRANTOR 2 NAME"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="font-bold mb-1 block text-xs">
                          NIC
                        </Label>
                        <Input
                          value={form.grantor2_nic}
                          onChange={(e) =>
                            handleNicInput(
                              "grantor2_nic",
                              e.target.value,
                              setGrantor2NicError,
                            )
                          }
                          placeholder="GRANTOR 2 NIC"
                          maxLength={12}
                          className={`text-sm ${grantor2NicError ? "border-destructive" : isValidNICFormat(form.grantor2_nic) ? "border-green-400" : ""}`}
                        />
                        {grantor2NicError && (
                          <p className="text-xs text-red-500 mt-1">
                            {grantor2NicError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label className="font-bold mb-1 block text-xs">
                        Address
                      </Label>
                      <Input
                        value={(form as any).grantor2_address}
                        onChange={(e) =>
                          handleChange("grantor2_address", e.target.value)
                        }
                        placeholder="GRANTOR 2 ADDRESS"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Page Selection */}
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Printer className="w-3 h-3" /> Pages to Print / මුද්‍රණය කළ
                    යුතු පිටු
                  </p>

                  <p className="text-xs text-gray-400 mb-2">සිංහල (Sinhala)</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                      <input
                        type="checkbox"
                        checked={printPages.sinhala1}
                        onChange={(e) =>
                          setPrintPages((p) => ({
                            ...p,
                            sinhala1: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-[#FAA300]"
                      />
                      <span>
                        <span className="font-medium">පිටුව 1</span>
                        <span className="text-gray-400 text-xs ml-1">
                          (වගන්ති 1–4 + ඇපකරුවන්)
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                      <input
                        type="checkbox"
                        checked={printPages.sinhala2}
                        onChange={(e) =>
                          setPrintPages((p) => ({
                            ...p,
                            sinhala2: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-[#FAA300]"
                      />
                      <span>
                        <span className="font-medium">පිටුව 2</span>
                        <span className="text-gray-400 text-xs ml-1">
                          (අත්සන් පිටුව)
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 text-sm"
                    onClick={() => {
                      setForm({ ...emptyForm });
                      setFormError("");
                      setSearchSuccess("");
                      setNewNicError("");
                      setGrantor1NicError("");
                      setGrantor2NicError("");
                      setSelectedProduct(null);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1 bg-[#FAA300] hover:bg-black text-white text-sm"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print Agreement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EXISTING CUSTOMER TAB ── */}
          <TabsContent value="existing">
            <Card>
              <CardHeader className="bg-gray-50 border-b py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="w-4 h-4" /> Search Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="font-bold mb-1 block text-xs">
                    NIC or Customer Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={searchTerm}
                      onChange={(e) =>
                        setSearchTerm(e.target.value.toUpperCase())
                      }
                      placeholder="E.g. 991234567V or G01/080/001/01"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="text-sm"
                    />
                    <Button
                      className="bg-[#FAA300] hover:bg-black text-white"
                      onClick={handleSearch}
                      disabled={searching}
                    >
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {searchError && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {searchError}
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center pt-4">
                  Search loads the customer into the form so you can review,
                  edit, and print.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PrintLoanAgreementDoc;
