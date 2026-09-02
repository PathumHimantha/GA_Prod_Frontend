import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  User,
  Building2,
  Banknote,
  FileText,
  XCircle,
  Loader2,
  Home,
  Plus,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { API, API_BASE_URL } from "@/apiConfig";

interface CustomerData {
  loan_code: string;
  customer_code: string;
  cname: string;
  nic: string;
  address: string;
  phone1: string;
  phone2: string;
  bname: string;
  bcode: string;
  center: string;
  ccode: string;
  group: string;
  name: string;
  loan_amount: number;
  full_loan: number;
  week_payment: number;
  interest: number;
  period: number;
  loan_date: string;
  due_date: string;
  document_fee: number;
  insurance_fee: number;
  loan_balance: number;
  image: string | null;
}

interface DocumentsData {
  application_form: string | null;
  application_form_2: string | null;
  customer_id_copy: string | null;
  husband_id_copy: string | null;
  marriage_certificate: string | null;
  billing_proof: string | null;
  loan_agreement: string | null;
  loan_agreement_2: string | null;
  promissory_note: string | null;
  bank_passbook: string | null;
}

const DOCUMENTS: { key: keyof DocumentsData; label: string }[] = [
  { key: "application_form", label: "Application Form" },
  { key: "application_form_2", label: "Application Form (Page 2)" },
  { key: "customer_id_copy", label: "Customer ID Copy" },
  { key: "husband_id_copy", label: "Husband ID Copy" },
  { key: "marriage_certificate", label: "Marriage Certificate" },
  { key: "billing_proof", label: "Billing Proof" },
  { key: "loan_agreement", label: "Loan Agreement (Photo 1)" },
  { key: "loan_agreement_2", label: "Loan Agreement (Photo 2)" },
  { key: "promissory_note", label: "Promissory Note" },
  { key: "bank_passbook", label: "Bank Passbook" },
];

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
};

const InfoItem = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary/40">
    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
      {label}
    </p>
    <p
      className={`font-semibold ${highlight ? "text-primary text-lg" : "text-gray-800"}`}
    >
      {value}
    </p>
  </div>
);

const LoanSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const loanCode = searchParams.get("loan_code");

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [documents, setDocuments] = useState<DocumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loanCode) {
      setError("No loan code provided.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(
          `${API.loan.successDetails}?loan_code=${loanCode}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        setCustomer(data.customer);
        setDocuments(data.documents);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loanCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="border-0 shadow-lg  mx-4">
          <CardContent className="p-12 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Customer Not Found
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {error || "The loan code provided does not match any records."}
            </p>
            <Button
              onClick={() => navigate("/dashboard/loans/consumer")}
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Add New Loan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className=" mx-auto px-4 py-6 space-y-6">
        {/* Success Banner */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-5 rounded-2xl shadow-lg">
          <CheckCircle2 className="w-10 h-10 shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Customer Added Successfully!</h2>
            <p className="text-sm opacity-90 mt-0.5">
              New loan application has been processed.
            </p>
          </div>
        </div>

        {/* Customer Photo */}
        <div className="flex justify-center">
          {customer.image && customer.image !== "0" ? (
            <img
              src={`${API_BASE_URL}/api/customers/uploads/customer_images/${customer.image}`}
              alt="Customer"
              className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-dashed border-gray-300 flex items-center justify-center">
              <User className="w-14 h-14 text-gray-300" />
            </div>
          )}
        </div>

        {/* Personal Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <User className="w-5 h-5 text-primary" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem
              label="Customer Code"
              value={customer.customer_code}
              highlight
            />
            <InfoItem label="Customer Name" value={customer.cname} />
            <InfoItem label="NIC Number" value={customer.nic} />
            <InfoItem label="Address" value={customer.address || "—"} />
            <InfoItem label="Phone Number 1" value={customer.phone1 || "—"} />
            <InfoItem label="Phone Number 2" value={customer.phone2 || "N/A"} />
          </CardContent>
        </Card>

        {/* Branch & Center */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="w-5 h-5 text-primary" /> Branch & Center
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem label="Branch Name" value={customer.bname} />
            <InfoItem label="Branch Code" value={customer.bcode} />
            <InfoItem label="Center Name" value={customer.center} />
            <InfoItem label="Center Code" value={customer.ccode} />
            <InfoItem label="Group" value={customer.group || "—"} />
            <InfoItem label="Executive Name" value={customer.name} />
          </CardContent>
        </Card>

        {/* Loan Details */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Banknote className="w-5 h-5 text-primary" /> Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem label="Loan Code" value={customer.loan_code} highlight />
            <InfoItem
              label="Loan Amount"
              value={fmt(customer.loan_amount)}
              highlight
            />
            <InfoItem
              label="Full Loan (With Interest)"
              value={fmt(customer.full_loan)}
            />
            <InfoItem
              label="Weekly Payment"
              value={fmt(customer.week_payment)}
            />
            <InfoItem
              label="Interest Rate"
              value={`${(Number(customer.interest) * 100).toFixed(0)}%`}
            />
            <InfoItem label="Loan Period" value={`${customer.period} Weeks`} />
            <InfoItem label="Loan Date" value={fmtDate(customer.loan_date)} />
            <InfoItem label="Due Date" value={fmtDate(customer.due_date)} />
            <InfoItem label="Document Fee" value={fmt(customer.document_fee)} />
            <InfoItem
              label="Insurance Fee"
              value={fmt(customer.insurance_fee)}
            />
            <InfoItem
              label="Current Balance"
              value={fmt(customer.loan_balance)}
              highlight
            />
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <FileText className="w-5 h-5 text-primary" /> Submitted Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {documents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {DOCUMENTS.map(({ key, label }) => {
                  const uploaded = !!documents[key];
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border-2 p-4 text-center transition-all ${
                        uploaded
                          ? "border-green-300 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      {uploaded ? (
                        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                      ) : (
                        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                      )}
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {label}
                      </p>
                      <Badge
                        className={
                          uploaded
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {uploaded ? "Uploaded" : "Not Uploaded"}
                      </Badge>
                      {uploaded && (
                        <div className="mt-3">
                          <a
                            href={`${API_BASE_URL}/api/customers/documents/file/${customer.loan_code}/${documents[key]}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> View Document
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No documents uploaded for this loan.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pb-6">
          <Button
            onClick={() => navigate("/dashboard/loans/consumer")}
            className="flex-1 h-12 gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Add New Loan
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="flex-1 h-12 gap-2"
          >
            <Home className="w-4 h-4" /> Back to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/cashier-payments")}
            className="flex-1 h-12 gap-2"
          >
            <Wallet className="w-4 h-4" /> Make Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoanSuccess;
