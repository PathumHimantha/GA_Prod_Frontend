import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  FileText,
  User,
  Search,
  Loader2,
  AlertCircle,
  Printer,
  Calendar,
  CheckCircle2,
  Package,
  Phone,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import { isValidNICFormat, getNICValidationMessage } from "@/lib/NICvalidation";

const isWeekend = (dateStr: string) => {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

const getTodayStr = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: "",
  cname: "",
  address: "",
  nic: "",
  phone: "",
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
  document_fee: "",
  staff_id: "",
  department: "",
  designation: "",
};

const StaffLoanAgreementDoc = () => {
  const { user } = useAuth();

  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState("");
  const [customerLoaded, setCustomerLoaded] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [newNicError, setNewNicError] = useState("");
  const [printPages, setPrintPages] = useState({
    sinhala1: true,
    sinhala2: false,
  });
  const [includeCourierFee, setIncludeCourierFee] = useState(true);

  const calculateDocumentFee = (totalAmount: number | string) => {
    const amount = parseFloat(String(totalAmount)) || 0;
    return amount >= 15000 ? 1000 : 500;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));
  };

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

  const handleNicInput = (value: string, setError: (msg: string) => void) => {
    if (value.length > 12) return;
    setForm((prev) => ({ ...prev, nic: value.toUpperCase() }));
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
      return "Loan amount is missing — reload the staff customer.";
    return "";
  };

  const printAgreement = (template: "S1" | "S2") => {
    // TODO: adjust template filenames if staff agreements use different ones
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
        "{{END_DATE}}": "",
        "{{GRANTOR1_NAME}}": form.grantor1_name || "",
        "{{GRANTOR1_NIC}}": form.grantor1_nic || "",
        "{{GRANTOR1_ADDRESS}}": form.grantor1_address || "",
        "{{GRANTOR2_NAME}}": form.grantor2_name || "",
        "{{GRANTOR2_NIC}}": form.grantor2_nic || "",
        "{{GRANTOR2_ADDRESS}}": form.grantor2_address || "",
        "{{BANK_NAME}}": form.bank_name || "",
        "{{BRANCH_NAME}}": form.bank_branch || "",
        "{{ACC_NAME}}": form.account_name || "",
        "{{ACC_NO}}": form.account_number || "",
        "{{EX_NAME}}": user?.name || "",
        "{{EX_DESIGNATION}}": user?.status || "",
        "{{DOCUMENT_FEE}}": parseFloat(form.document_fee || "0").toLocaleString(
          "en-LK",
        ),
        "{{COURIER_FEE}}": includeCourierFee
          ? parseFloat(form.courier_fee || "0").toLocaleString("en-LK")
          : "0",
        "{{STAFF_ID}}": form.staff_id || "",
        "{{DEPARTMENT}}": form.department || "",
        "{{DESIGNATION}}": form.designation || "",
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
    setCustomerLoaded(false);

    try {
      const bcode = user?.bcode;
      const res = await fetch(
        `${API_BASE_URL}/staff/get_staff_loan_agreement?term=${encodeURIComponent(searchTerm)}&bcode=${bcode}`,
      );
      const data = await res.json();

      if (data?.success && data?.customer) {
        const c = data.customer;
        const g1 = c.guarantors?.[0] || {};
        const g2 = c.guarantors?.[1] || {};

        setForm({
          date: getTodayStr() || "",
          cname: c.cname || "",
          address: c.address || "",
          nic: c.nic || "",
          phone: c.phone1 || "",
          loan_amount: c.loan_amount?.toString() || "",
          interest: "30",
          period: "13",
          week_payment: c.week_payment?.toString() || "",
          grantor1_name: g1.gname || "",
          grantor1_nic: g1.gNic || "",
          grantor1_address: g1.gAddress || "",
          grantor2_name: g2.gname || "",
          grantor2_nic: g2.gNic || "",
          grantor2_address: g2.gAddress || "",
          bank_name: c.bank_name || "",
          bank_branch: c.bank_branch || "",
          account_name: c.account_name || "",
          account_number: c.account_number || "",
          business_type: c.business_type || "",
          product_id: c.product_id || "",
          product_name: c.product_name || "",
          product_price: c.product_price?.toString() || "",
          product_code: c.product_code || "",
          courier_fee: c.courier_fee?.toString() || "",
          document_fee: String(calculateDocumentFee(c.loan_amount || 0)),
          staff_id: c.staff_id || "",
          department: c.department || "",
          designation: c.designation || "",
        });
        setFormError("");
        setNewNicError("");
        setSearchSuccess(`${c.cname} (${c.customer_code})`);
        setCustomerLoaded(true);
      } else {
        setSearchError(
          data?.error ||
            "No staff customer found. Please check the NIC or customer code.",
        );
      }
    } catch {
      setSearchError("Error connecting to server.");
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setForm({ ...emptyForm });
    setFormError("");
    setSearchSuccess("");
    setSearchError("");
    setSearchTerm("");
    setNewNicError("");
    setCustomerLoaded(false);
    setIncludeCourierFee(true);
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
            කුලියට විකිණීමේ ගිවිසුම (Staff Hire Purchase Agreement)
          </h1>
        </div>

        {/* ── Search Card ── */}
        <Card className="mb-4">
          <CardHeader className="bg-gray-50 border-b py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4" /> Search Staff Customer
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
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
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

            {searchSuccess && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Loaded: {searchSuccess}
              </div>
            )}

            {!customerLoaded && !searchError && (
              <p className="text-xs text-gray-400 text-center pt-1">
                Search loads the staff customer's approved product cart into the
                form below so you can review and print.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Form — only shown after a customer is loaded ── */}
        {customerLoaded && (
          <Card>
            <CardHeader className="bg-gray-50 border-b py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Staff Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Date + Customer Name */}
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

              {/* NIC + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold mb-1 block text-xs">NIC</Label>
                  <Input
                    value={form.nic}
                    onChange={(e) =>
                      handleNicInput(e.target.value, setNewNicError)
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

              {/* Address */}
              <div>
                <Label className="font-bold mb-1 block text-xs">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="ADDRESS"
                  className="text-sm"
                />
              </div>

              {/* Staff-specific (read-only from API) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="font-bold mb-1 block text-xs">
                    Staff ID
                  </Label>
                  <Input
                    value={form.staff_id}
                    readOnly
                    className="text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block text-xs">
                    Department
                  </Label>
                  <Input
                    value={form.department}
                    readOnly
                    className="text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block text-xs">
                    Designation
                  </Label>
                  <Input
                    value={form.designation}
                    readOnly
                    className="text-sm bg-gray-50"
                  />
                </div>
              </div>

              {/* Product — read-only */}
              <div>
                <Label className="font-bold mb-1 block text-xs flex items-center gap-1">
                  <Package className="w-3 h-3" /> Product
                </Label>
                <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">
                        Product:
                      </span>
                      <span className="font-medium">
                        {form.product_name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">Code:</span>
                      <span className="font-medium">
                        {form.product_id || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">
                        Price:
                      </span>
                      <span className="font-bold text-green-600">
                        Rs.{" "}
                        {parseFloat(form.product_price || "0").toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">
                        Document Fee:
                      </span>
                      <span className="font-medium text-amber-600">
                        Rs.{" "}
                        {parseFloat(form.document_fee || "0").toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-600">
                        Courier Fee:
                      </span>
                      <span className="font-medium text-amber-600">
                        Rs.{" "}
                        {parseFloat(form.courier_fee || "0").toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Courier fee toggle */}
                <div className="mt-3 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Include courier fee
                      </p>
                      <p className="text-xs text-gray-500">
                        {includeCourierFee
                          ? `Rs. ${parseFloat(form.courier_fee || "0").toLocaleString()} will be added to the agreement`
                          : "Courier fee will be excluded"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeCourierFee((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      includeCourierFee ? "bg-amber-500" : "bg-gray-300"
                    }`}
                    aria-pressed={includeCourierFee}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        includeCourierFee ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Guarantors — read-only from API */}
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
                        readOnly
                        className="text-sm bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label className="font-bold mb-1 block text-xs">
                        NIC
                      </Label>
                      <Input
                        value={form.grantor1_nic}
                        readOnly
                        className="text-sm bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="font-bold mb-1 block text-xs">
                      Address
                    </Label>
                    <Input
                      value={form.grantor1_address}
                      readOnly
                      className="text-sm bg-gray-50"
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
                        readOnly
                        className="text-sm bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label className="font-bold mb-1 block text-xs">
                        NIC
                      </Label>
                      <Input
                        value={form.grantor2_nic}
                        readOnly
                        className="text-sm bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="font-bold mb-1 block text-xs">
                      Address
                    </Label>
                    <Input
                      value={form.grantor2_address}
                      readOnly
                      className="text-sm bg-gray-50"
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

                    setIncludeCourierFee(true);
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
        )}
      </div>
    </div>
  );
};

export default StaffLoanAgreementDoc;
