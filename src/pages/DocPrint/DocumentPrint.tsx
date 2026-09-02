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
} from "lucide-react";
import { APP_API_BASE_URL } from "@/apiConfig";
import { isValidNICFormat, getNICValidationMessage } from "@/lib/NICvalidation";
interface CustomerData {
  cname: string;
  address: string;
  nic: string;
  loan_amount: string | number;
  customer_code: string;
  grantor1_name?: string;
  grantor1_nic?: string;
  grantor2_name?: string;
  grantor2_nic?: string;
  loan_date?: string;
}

const isWeekend = (dateStr: string) => {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

const getTodayStr = () => new Date().toISOString().split("T")[0];

const DocumentPrint = () => {
  const { user } = useAuth();

  // New Customer state
  const [newForm, setNewForm] = useState({
    date: "",
    cname: "",
    address: "",
    nic: "",
    loan_amount: "",
    grantor1_name: "",
    grantor1_nic: "",
    grantor2_name: "",
    grantor2_nic: "",
  });
  const [newFormError, setNewFormError] = useState("");

  // Existing Customer state
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [existingCustomer, setExistingCustomer] = useState<CustomerData | null>(
    null,
  );
  const [newNicError, setNewNicError] = useState("");
  const [grantor1NicError, setGrantor1NicError] = useState("");
  const [grantor2NicError, setGrantor2NicError] = useState("");
  // --- Helpers ---
  const handleNewChange = (field: string, value: string) => {
    setNewForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const handleDateChange = (value: string) => {
    const today = getTodayStr();
    if (value < today) return; // block past dates
    if (isWeekend(value)) return; // block weekends
    setNewForm((prev) => ({ ...prev, date: value }));
  };
  const handleNicInput = (
    field: "nic" | "grantor1_nic" | "grantor2_nic",
    value: string,
    setError: (msg: string) => void,
  ) => {
    if (value.length > 12) return;
    setNewForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));

    const formatError = getNICValidationMessage(value);
    setError(formatError || "");
  };
  const validateNew = () => {
    if (!newForm.date) return "Please select a date.";
    if (!newForm.cname.trim()) return "Customer name is required.";
    if (!newForm.address.trim()) return "Address is required.";
    if (!newForm.nic.trim()) return "NIC is required.";
    if (!isValidNICFormat(newForm.nic)) return "Invalid customer NIC format.";
    if (!newForm.loan_amount) return "Loan amount is required.";
    if (!newForm.grantor1_name.trim()) return "Grantor 1 name is required.";
    if (!newForm.grantor1_nic.trim()) return "Grantor 1 NIC is required.";
    if (!isValidNICFormat(newForm.grantor1_nic))
      return "Invalid Grantor 1 NIC format.";
    if (!newForm.grantor2_name.trim()) return "Grantor 2 name is required.";
    if (!newForm.grantor2_nic.trim()) return "Grantor 2 NIC is required.";
    if (!isValidNICFormat(newForm.grantor2_nic))
      return "Invalid Grantor 2 NIC format.";
    return "";
  };

  // --- Print handlers ---
  const buildPrintData = (
    data: Partial<CustomerData> & { date?: string },
  ): CustomerData & { date: string } => ({
    cname: data.cname || "",
    address: data.address || "",
    nic: data.nic || "",
    loan_amount: data.loan_amount || "",
    customer_code: data.customer_code || "",
    grantor1_name: data.grantor1_name || "",
    grantor1_nic: data.grantor1_nic || "",
    grantor2_name: data.grantor2_name || "",
    grantor2_nic: data.grantor2_nic || "",
    date: data.date || data.loan_date || "",
  });

  const printDocument = (
    type: "promissory" | "agreement",
    data: ReturnType<typeof buildPrintData>,
  ) => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const formattedAmount = Number(data.loan_amount).toLocaleString("en-LK");

    const promissoryHTML = `
      <h2 style="text-align:center;">PROMISSORY NOTE</h2>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Customer Name:</strong> ${data.cname}</p>
      <p><strong>NIC:</strong> ${data.nic}</p>
      <p><strong>Address:</strong> ${data.address}</p>
      <p><strong>Loan Amount:</strong> Rs. ${formattedAmount}</p>
      <br/>
      <p>I, <strong>${data.cname}</strong>, hereby promise to pay the sum of <strong>Rs. ${formattedAmount}</strong> as agreed.</p>
      <br/><br/>
      <table style="width:100%;margin-top:40px;">
        <tr>
          <td style="width:33%;text-align:center;">___________________<br/>Customer Signature<br/>${data.cname}</td>
          <td style="width:33%;text-align:center;">___________________<br/>Grantor 1<br/>${data.grantor1_name}<br/>${data.grantor1_nic}</td>
          <td style="width:33%;text-align:center;">___________________<br/>Grantor 2<br/>${data.grantor2_name}<br/>${data.grantor2_nic}</td>
        </tr>
      </table>
    `;

    const agreementHTML = `
      <h2 style="text-align:center;">LOAN AGREEMENT</h2>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Customer Name:</strong> ${data.cname}</p>
      <p><strong>NIC:</strong> ${data.nic}</p>
      <p><strong>Address:</strong> ${data.address}</p>
      <p><strong>Loan Amount:</strong> Rs. ${formattedAmount}</p>
      <br/>
      <p>This agreement is made between <strong>Golden Asia</strong> and <strong>${data.cname}</strong> for a loan of <strong>Rs. ${formattedAmount}</strong>.</p>
      <br/>
      <p><strong>Grantor 1:</strong> ${data.grantor1_name} — NIC: ${data.grantor1_nic}</p>
      <p><strong>Grantor 2:</strong> ${data.grantor2_name} — NIC: ${data.grantor2_nic}</p>
      <br/><br/>
      <table style="width:100%;margin-top:40px;">
        <tr>
          <td style="width:33%;text-align:center;">___________________<br/>Customer Signature<br/>${data.cname}</td>
          <td style="width:33%;text-align:center;">___________________<br/>Grantor 1<br/>${data.grantor1_name}</td>
          <td style="width:33%;text-align:center;">___________________<br/>Grantor 2<br/>${data.grantor2_name}</td>
        </tr>
      </table>
    `;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${type === "promissory" ? "Promissory Note" : "Loan Agreement"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20mm; font-size: 11pt; line-height: 1.8; }
            h2 { margin-bottom: 20px; }
            p { margin: 6px 0; }
            table { border-collapse: collapse; }
            @page { size: A4; margin: 20mm; }
          </style>
        </head>
        <body>
          ${type === "promissory" ? promissoryHTML : agreementHTML}
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const handleNewPrint = (type: "promissory" | "agreement") => {
    const err = validateNew();
    if (err) {
      setNewFormError(err);
      return;
    }
    setNewFormError("");
    if (type === "promissory") {
      printPromissory(buildPrintData(newForm));
    } else {
      printAgreement(buildPrintData(newForm)); // ← was printDocument("agreement", ...)
    }
  };
  // --- Existing customer search ---
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchError("");
    setExistingCustomer(null);

    try {
      const bcode = user?.bcode || "G01";
      const res = await fetch(
        `${APP_API_BASE_URL}/api/loan/get_customer_by_loan_to_transfer?term=${encodeURIComponent(searchTerm)}&bcode=${bcode}`,
      );
      const data = await res.json();

      if (data && (data.cname || data.customer_code)) {
        setExistingCustomer(data);
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

  const handleExistingPrint = (type: "promissory" | "agreement") => {
    if (!existingCustomer) return;
    if (type === "promissory") {
      printPromissory(buildPrintData(existingCustomer));
    } else {
      printAgreement(buildPrintData(existingCustomer)); // ← was printDocument(...)
    }
  };
  const printPromissory = (data: ReturnType<typeof buildPrintData>) => {
    const win = window.open(
      "/templates/LoanPnote.html",
      "_blank",
      "width=1100,height=750",
    );
    if (!win) return;

    win.addEventListener("load", () => {
      const amount = Number(data.loan_amount) || 0;
      const interestRate = Number((data as any).interest) || 30;
      const period = Number((data as any).period) || 13;

      const totalLoan = amount + (amount * interestRate) / 100;
      const calculatedWeekPayment = Math.ceil(totalLoan / period);

      // ← use || not falsy check — 0 is falsy so force calculated value
      const finalWeekPayment =
        Number((data as any).week_payment) || calculatedWeekPayment;

      console.log(
        "week_payment:",
        finalWeekPayment,
        "amount:",
        amount,
        "interest:",
        interestRate,
      );

      (win as any).fillData({
        date: data.date,
        cname: data.cname,
        address: data.address,
        nic: data.nic,
        loan_amount: amount,
        interest: interestRate.toString(),
        week_payment: finalWeekPayment,
        grantor1_name: data.grantor1_name,
        grantor1_nic: data.grantor1_nic,
        grantor2_name: data.grantor2_name,
        grantor2_nic: data.grantor2_nic,
      });

      // ── 2. Auto print without showing button ──
      setTimeout(() => win.print(), 800);
    });
  };
  const printAgreement = (data: ReturnType<typeof buildPrintData>) => {
    const win = window.open(
      "/templates/LoanAgreement.html",
      "_blank",
      "width=1100,height=750",
    );
    if (!win) return;

    win.addEventListener("load", () => {
      // Parse date parts
      const d = new Date(data.date);
      const day = d.getDate().toString().padStart(2, "0");
      const month = d.toLocaleString("en-LK", { month: "long" });
      const year = d.getFullYear().toString().slice(-2);

      const amount = Number(data.loan_amount);
      const interest = Number((data as any).interest) || 30;
      const period = Number((data as any).period) || 13;
      const weekPayment =
        Number((data as any).week_payment) ||
        Math.ceil((amount + (amount * interest) / 100) / period);
      const totalInterest = (amount * interest) / 100;
      const fullLoan = amount + totalInterest;

      const replacements: Record<string, string> = {
        "{{DAY}}": day,
        "{{MONTH}}": month,
        "{{YEAR}}": year,
        "{{CUSTOMER_NAME}}": data.cname,
        "{{ADDRESS}}": data.address,
        "{{LOAN_AMOUNT}}": amount.toLocaleString("en-LK"),
        "{{LOAN_AMOUNT_WORDS}}": "", // fill if you have a number-to-words util
        "{{LOAN_PURPOSE}}": (data as any).business_type || "",
        "{{INTEREST_RATE}}": `${interest}%`,
        "{{TOTAL_INTEREST}}": totalInterest.toLocaleString("en-LK"),
        "{{FULL_LOAN}}": fullLoan.toLocaleString("en-LK"),
        "{{PERIOD}}": period.toString(),
        "{{WEEK_PAYMENT}}": weekPayment.toLocaleString("en-LK"),
        "{{PAYMENT_DAY}}": d.toLocaleString("en-LK", { weekday: "long" }),
        "{{START_DATE}}": data.date,
        "{{END_DATE}}": (data as any).due_date || "",
        "{{GRANTOR1_NAME}}": data.grantor1_name || "",
        "{{GRANTOR1_NIC}}": data.grantor1_nic || "",
        "{{GRANTOR2_NAME}}": data.grantor2_name || "",
        "{{GRANTOR2_NIC}}": data.grantor2_nic || "",
      };

      const doc = win.document;
      let html = doc.documentElement.innerHTML;
      Object.entries(replacements).forEach(([k, v]) => {
        html = html.split(k).join(v);
      });
      doc.documentElement.innerHTML = html;

      setTimeout(() => win.print(), 600);
    });
  };
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 py-6  mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#FAA300]" />
            Document Print
          </h1>
        </div>

        <Tabs defaultValue="new">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="new" className="flex-1">
              New Customer
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex-1">
              Existing Customer
            </TabsTrigger>
          </TabsList>

          {/* ── NEW CUSTOMER TAB ── */}
          <TabsContent value="new">
            <Card>
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" /> New Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Date */}
                <div>
                  <Label className="font-bold mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date
                  </Label>
                  <Input
                    type="date"
                    min={getTodayStr()}
                    value={newForm.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                  {newForm.date && isWeekend(newForm.date) && (
                    <p className="text-xs text-red-500 mt-1">
                      Weekends are not allowed.
                    </p>
                  )}
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Customer Info
                  </p>
                  <div>
                    <Label className="font-bold mb-1 block">
                      Customer Name
                    </Label>
                    <Input
                      value={newForm.cname}
                      onChange={(e) => handleNewChange("cname", e.target.value)}
                      placeholder="FULL NAME"
                    />
                  </div>
                  <div>
                    <Label className="font-bold mb-1 block">Address</Label>
                    <Input
                      value={newForm.address}
                      onChange={(e) =>
                        handleNewChange("address", e.target.value)
                      }
                      placeholder="ADDRESS"
                    />
                  </div>
                  <div>
                    <Label className="font-bold mb-1 block">NIC</Label>
                    <Input
                      value={newForm.nic}
                      onChange={(e) =>
                        handleNicInput("nic", e.target.value, setNewNicError)
                      }
                      placeholder="NIC NUMBER"
                      maxLength={12}
                      className={
                        newNicError
                          ? "border-destructive"
                          : isValidNICFormat(newForm.nic)
                            ? "border-green-400"
                            : ""
                      }
                    />
                    {newNicError && (
                      <p className="text-xs text-red-500 mt-1">{newNicError}</p>
                    )}
                  </div>

                  <div>
                    <Label className="font-bold mb-1 block">
                      Loan Amount (Rs.)
                    </Label>
                    <Input
                      type="number"
                      value={newForm.loan_amount}
                      onChange={(e) =>
                        setNewForm((p) => ({
                          ...p,
                          loan_amount: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Grantor 1 */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Grantor 1
                  </p>
                  <div>
                    <Label className="font-bold mb-1 block">Name</Label>
                    <Input
                      value={newForm.grantor1_name}
                      onChange={(e) =>
                        handleNewChange("grantor1_name", e.target.value)
                      }
                      placeholder="GRANTOR 1 NAME"
                    />
                  </div>
                  <div>
                    <Label className="font-bold mb-1 block">NIC</Label>
                    <Input
                      value={newForm.grantor1_nic}
                      onChange={(e) =>
                        handleNicInput(
                          "grantor1_nic",
                          e.target.value,
                          setGrantor1NicError,
                        )
                      }
                      placeholder="GRANTOR 1 NIC"
                      maxLength={12}
                      className={
                        grantor1NicError
                          ? "border-destructive"
                          : isValidNICFormat(newForm.grantor1_nic)
                            ? "border-green-400"
                            : ""
                      }
                    />
                    {grantor1NicError && (
                      <p className="text-xs text-red-500 mt-1">
                        {grantor1NicError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Grantor 2 */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Grantor 2
                  </p>
                  <div>
                    <Label className="font-bold mb-1 block">Name</Label>
                    <Input
                      value={newForm.grantor2_name}
                      onChange={(e) =>
                        handleNewChange("grantor2_name", e.target.value)
                      }
                      placeholder="GRANTOR 2 NAME"
                    />
                  </div>
                  <div>
                    <Label className="font-bold mb-1 block">NIC</Label>
                    <Input
                      value={newForm.grantor2_nic}
                      onChange={(e) =>
                        handleNicInput(
                          "grantor2_nic",
                          e.target.value,
                          setGrantor2NicError,
                        )
                      }
                      placeholder="GRANTOR 2 NIC"
                      maxLength={12}
                      className={
                        grantor2NicError
                          ? "border-destructive"
                          : isValidNICFormat(newForm.grantor2_nic)
                            ? "border-green-400"
                            : ""
                      }
                    />
                    {grantor2NicError && (
                      <p className="text-xs text-red-500 mt-1">
                        {grantor2NicError}
                      </p>
                    )}
                  </div>
                </div>

                {newFormError && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {newFormError}
                  </div>
                )}

                {/* Print Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 bg-[#FAA300] hover:bg-black text-white"
                    onClick={() => handleNewPrint("promissory")}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print Promissory
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleNewPrint("agreement")}
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
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4" /> Search Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="font-bold mb-1 block">
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

                {existingCustomer && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Customer Code</span>
                        <span className="font-bold">
                          {existingCustomer.customer_code}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name</span>
                        <span className="font-bold">
                          {existingCustomer.cname}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">NIC</span>
                        <span className="font-bold">
                          {existingCustomer.nic}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Address</span>
                        <span className="font-bold text-right max-w-[60%]">
                          {existingCustomer.address}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Loan Amount</span>
                        <span className="font-bold text-[#FAA300]">
                          Rs.{" "}
                          {Number(existingCustomer.loan_amount).toLocaleString(
                            "en-LK",
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-[#FAA300] hover:bg-black text-white"
                        onClick={() => handleExistingPrint("promissory")} // ← was printPromissory directly
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print Promissory
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => handleExistingPrint("agreement")}
                      >
                        <Printer className="w-4 h-4 mr-2" /> Print Agreement
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DocumentPrint;
