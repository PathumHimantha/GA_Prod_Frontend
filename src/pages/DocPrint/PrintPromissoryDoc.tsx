import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  User,
  Search,
  Loader2,
  AlertCircle,
  Printer,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import { isValidNICFormat, getNICValidationMessage } from "@/lib/NICvalidation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  loan_amount: "",
  interest: "",
  period: "",
  week_payment: "",
  grantor1_name: "",
  grantor1_nic: "",
  grantor2_name: "",
  grantor2_nic: "",
};

const PrintPromissoryDoc = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("new");
  const [agreementType, setAgreementType] = useState<
    "Consumer" | "Business" | "Daily"
  >("Select");
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [newNicError, setNewNicError] = useState("");
  const [grantor1NicError, setGrantor1NicError] = useState("");
  const [grantor2NicError, setGrantor2NicError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7); // Allow up to 7 days in future
    return maxDate.toISOString().split("T")[0];
  };

  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  };

  const getTodayStr = () => new Date().toISOString().split("T")[0];

  // Update the handleDateChange function
  const handleDateChange = (value: string) => {
    const today = getTodayStr();
    const maxDate = getMaxDate();

    // Check if date is in the past
    if (value < today) {
      setFormError("Cannot select past dates.");
      return;
    }

    // Check if date is more than 7 days in future
    if (value > maxDate) {
      setFormError("Cannot select dates more than 1 week in advance.");
      return;
    }

    // Check if date is weekend
    if (isWeekend(value)) {
      setFormError("Weekends (Saturday/Sunday) are not allowed.");
      return;
    }

    // Clear error if all validations pass
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
    if (!form.loan_amount) return "Loan amount is required.";
    // if (!form.grantor1_name.trim()) return "Grantor 1 name is required.";
    // if (!form.grantor1_nic.trim()) return "Grantor 1 NIC is required.";
    // if (!isValidNICFormat(form.grantor1_nic))
    //   return "Invalid Grantor 1 NIC format.";
    // if (!form.grantor2_name.trim()) return "Grantor 2 name is required.";
    // if (!form.grantor2_nic.trim()) return "Grantor 2 NIC is required.";
    // if (!isValidNICFormat(form.grantor2_nic))
    //   return "Invalid Grantor 2 NIC format.";
    return "";
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
  const printPromissory = () => {
    const templateFile =
      agreementType === "Daily" ? "LoanPnoteDay" : "LoanPnote";
    const win = window.open(
      `/templates/${templateFile}.html`,
      "_blank",
      "width=1100,height=750",
    );
    if (!win) return;
    win.addEventListener("load", () => {
      const today = new Date();
      const selectedDate = form.date ? new Date(form.date) : new Date();
      const amount = Number(form.loan_amount) || 0;
      const interestRate = Number(form.interest) || 30;
      // ✅ Period is driven purely by agreement type: Daily = 65 days, otherwise 13 weeks.
      // form.period is not used here since it can hold stale values from a
      // previous "Existing Customer" search that don't match the currently selected type.
      const period = agreementType === "Daily" ? 65 : 13;
      const totalLoan = amount + (amount * interestRate) / 100;
      const finalWeekPayment = totalLoan / period;

      // Number(form.week_payment) || Math.ceil(totalLoan / period);
      (win as any).fillData({
        date: selectedDate,
        cname: form.cname,
        address: form.address,
        nic: form.nic,
        loan_amount: amount,
        loan_amount_words: amountToWords(amount),
        interest: interestRate.toString(),
        week_payment: finalWeekPayment,
        grantor1_name: form.grantor1_name,
        grantor1_nic: form.grantor1_nic,
        grantor2_name: form.grantor2_name,
        grantor2_nic: form.grantor2_nic,
      });
      setTimeout(() => win.print(), 800);
    });
  };

  const handlePrint = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    printPromissory();
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchSuccess("");

    try {
      const bcode = user?.bcode;
      const res = await fetch(
        `${API_BASE_URL}/api/docprint/get_customer_by_loan_to_docprint?term=${encodeURIComponent(searchTerm)}&bcode=${bcode}`,
      );
      const data = await res.json();

      if (data?.success && data?.customer) {
        const c = data.customer;
        setForm({
          date: getTodayStr() || "",
          cname: c.cname || "",
          address: c.address || "",
          nic: c.nic || "",
          loan_amount: c.loan_amount?.toString() || "",
          interest: c.interest ? String(Number(c.interest) * 100) : "30",
          period: c.period?.toString() || "13",
          week_payment: c.week_payment?.toString() || "",
          grantor1_name: c.guarantors?.[0]?.gname || "",
          grantor1_nic: c.guarantors?.[0]?.gNic || "",
          grantor2_name: c.guarantors?.[1]?.gname || "",
          grantor2_nic: c.guarantors?.[1]?.gNic || "",
        });
        setFormError("");
        setNewNicError("");
        setGrantor1NicError("");
        setGrantor2NicError("");
        setSearchSuccess(`${c.cname} (${c.customer_code})`);
        setActiveTab("new"); // switch to form tab
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 py-6 mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#FAA300]" />
            Promissory Note Print
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

          {/* ── FORM TAB (new + pre-filled existing) ── */}
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
                      <User className="w-4 h-4" /> New Customer Details
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1 flex-1">
                  <Label className="font-bold mb-1 block text-xs flex items-center gap-1">
                    Agreement Type
                  </Label>
                  <Select
                    value={agreementType}
                    onValueChange={(v) =>
                      setAgreementType(v as "Consumer" | "Business" | "Daily")
                    }
                  >
                    <SelectTrigger className="h-10 bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Select">Select Loan Type</SelectItem>
                      <SelectItem value="Consumer">Consumer Loan</SelectItem>
                      <SelectItem value="Business">Business Loan</SelectItem>
                      <SelectItem value="Daily">Daily Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

                {/* Row 2: NIC + Loan Amount */}
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
                    <Label className="font-bold mb-1 block text-xs">
                      Loan Amount (Rs.)
                    </Label>
                    <Input
                      type="number"
                      value={form.loan_amount}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, loan_amount: e.target.value }))
                      }
                      placeholder="0.00"
                      className="text-sm"
                    />
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

                {/* Guarantors */}
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Guarantors
                  </p>

                  <div className="mb-3">
                    <p className="text-xs text-gray-400 font-medium mb-2">
                      Grantor 1
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
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">
                      Grantor 2
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
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1 bg-[#FAA300] hover:bg-black text-white text-sm"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print Promissory
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

export default PrintPromissoryDoc;
