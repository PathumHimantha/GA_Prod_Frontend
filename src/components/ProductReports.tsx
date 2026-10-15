import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Package,
  Calendar,
  TrendingUp,
  Wallet,
  Banknote,
  Truck,
  FileText,
  Users,
  Building2,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";

interface Stats {
  total_loans: number;
  total_amount: number;
  total_balance: number;
  total_weekly: number;
  total_doc_fee: number;
  total_courier: number;
  total_paid: number;
}

interface BranchRow {
  bname: string;
  total_loans: number;
  total_amount: number;
  total_balance: number;
  total_paid: number;
  total_doc_fee: number;
  total_courier: number;
}

interface ExecRow {
  bname: string;
  executive: string;
  total_loans: number;
  total_amount: number;
  total_balance: number;
  total_paid: number;
}

interface LoanRow {
  loan_code: string;
  customer_code: string;
  customer_name: string;
  customer_nic: string;
  bname: string;
  center: string;
  ccode: string;
  total_amount: number;
  loan_balance: number;
  week_payment: number;
  payment: number;
  document_fee: number;
  courier_charge: number;
  loan_date: string;
  due_date: string;
  created_by: string;
  order_status: string;
}

const fmt = (n: number) =>
  Number(n).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtShort = (n: number) =>
  Number(n).toLocaleString("en-LK", { maximumFractionDigits: 0 });

const ProductReports = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  const isBranchManager = user?.status === "branch_manager";
  const isExecutive =
    user?.status === "executive" || user?.status === "manager";

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState<Stats | null>(null);
  const [branchRows, setBranchRows] = useState<BranchRow[]>([]);
  const [execRows, setExecRows] = useState<ExecRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [tab, setTab] = useState<"branches" | "executives" | "loans">(
    "branches",
  );

  const load = useCallback(async () => {
    if (!dateFrom) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo || dateFrom,
        role: user?.status || "",
        user_id: user?.id?.toString() || "",
        user_branch: user?.bname || "",
      });

      const res = await fetch(
        `${API_BASE_URL}/report/product_reports?${params}`,
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load product reports");
      }

      setStats(data.stats);
      setBranchRows(data.branch_breakdown || []);
      setExecRows(data.exec_breakdown || []);
      setLoans(data.loans || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load");
      setStats(null);
      setBranchRows([]);
      setExecRows([]);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, user]);

  // Initial load + auto-reload when date changes
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Default tab: branch for admin/regional, executives for BM, loans for exec
  useEffect(() => {
    if (isAdmin || isRegional) setTab("branches");
    else if (isBranchManager) setTab("executives");
    else setTab("loans");
  }, [isAdmin, isRegional, isBranchManager]);

  return (
    <div className="space-y-6">
      {/* ── Filters ── */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 py-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Product Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Date From
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Date To
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
            </div>
            <Button
              onClick={load}
              disabled={loading || !dateFrom}
              className="h-11 gap-2 bg-primary hover:bg-primary/90 lg:col-span-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 text-center text-sm text-red-600">
            ⚠️ {error}
          </CardContent>
        </Card>
      )}

      {/* ── Stats Cards ── */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total Loans"
            value={fmtShort(stats.total_loans)}
            icon={Package}
            tint="blue"
          />
          <StatCard
            label="Loan Amount"
            value={`Rs. ${fmtShort(stats.total_amount)}`}
            icon={Wallet}
            tint="indigo"
          />
          <StatCard
            label="Total Paid"
            value={`Rs. ${fmtShort(stats.total_paid)}`}
            icon={Banknote}
            tint="green"
          />
          <StatCard
            label="Balance"
            value={`Rs. ${fmtShort(stats.total_balance)}`}
            icon={TrendingUp}
            tint="amber"
          />
          <StatCard
            label="Doc Fees"
            value={`Rs. ${fmtShort(stats.total_doc_fee)}`}
            icon={FileText}
            tint="purple"
          />
          <StatCard
            label="Courier"
            value={`Rs. ${fmtShort(stats.total_courier)}`}
            icon={Truck}
            tint="orange"
          />
        </div>
      )}

      {/* ── Breakdown Tabs ── */}
      {!loading && !error && stats && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <div className="px-4 pt-4">
                <TabsList className="grid grid-cols-3 w-full sm:w-auto gap-1 bg-muted p-1 rounded-xl">
                  <TabsTrigger value="branches">
                    <Building2 className="w-4 h-4 mr-2" />
                    By Branch
                  </TabsTrigger>
                  <TabsTrigger value="executives">
                    <Users className="w-4 h-4 mr-2" />
                    By Executive
                  </TabsTrigger>
                  <TabsTrigger value="loans">
                    <Package className="w-4 h-4 mr-2" />
                    All Loans
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Branch tab */}
              <TabsContent value="branches" className="p-4 mt-2">
                <BranchTable rows={branchRows} />
              </TabsContent>

              {/* Executive tab */}
              <TabsContent value="executives" className="p-4 mt-2">
                <ExecTable rows={execRows} />
              </TabsContent>

              {/* Loans tab */}
              <TabsContent value="loans" className="p-4 mt-2">
                <LoanTable rows={loans} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: any;
  tint: "blue" | "indigo" | "green" | "amber" | "purple" | "orange";
}) {
  const tints: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    green: "bg-green-50 text-green-600 border-green-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };
  return (
    <Card className={`border ${tints[tint]} shadow-sm`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {label}
          </p>
          <p className="text-base font-bold text-gray-900 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Branch table ── */
function BranchTable({ rows }: { rows: BranchRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 py-8">No branch data</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Loans</TableHead>
            <TableHead className="text-right">Loan Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Doc Fee</TableHead>
            <TableHead className="text-right">Courier</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.bname}>
              <TableCell className="font-medium">{r.bname}</TableCell>
              <TableCell className="text-right">{r.total_loans}</TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.total_amount)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                Rs. {fmt(r.total_paid)}
              </TableCell>
              <TableCell className="text-right text-amber-600">
                Rs. {fmt(r.total_balance)}
              </TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.total_doc_fee)}
              </TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.total_courier)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-amber-50 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">
              {rows.reduce((s, r) => s + Number(r.total_loans), 0)}
            </TableCell>
            <TableCell className="text-right">
              Rs. {fmt(rows.reduce((s, r) => s + Number(r.total_amount), 0))}
            </TableCell>
            <TableCell className="text-right text-green-700">
              Rs. {fmt(rows.reduce((s, r) => s + Number(r.total_paid), 0))}
            </TableCell>
            <TableCell className="text-right text-amber-700">
              Rs. {fmt(rows.reduce((s, r) => s + Number(r.total_balance), 0))}
            </TableCell>
            <TableCell className="text-right">
              Rs. {fmt(rows.reduce((s, r) => s + Number(r.total_doc_fee), 0))}
            </TableCell>
            <TableCell className="text-right">
              Rs. {fmt(rows.reduce((s, r) => s + Number(r.total_courier), 0))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Executive table ── */
function ExecTable({ rows }: { rows: ExecRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 py-8">
        No executive data
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Executive</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead className="text-right">Loans</TableHead>
            <TableHead className="text-right">Loan Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.bname}-${r.executive}`}>
              <TableCell className="font-medium">{r.executive}</TableCell>
              <TableCell>
                <Badge className="bg-blue-100 text-blue-700 border-0">
                  {r.bname}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{r.total_loans}</TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.total_amount)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                Rs. {fmt(r.total_paid)}
              </TableCell>
              <TableCell className="text-right text-amber-600">
                Rs. {fmt(r.total_balance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Loans table ── */
function LoanTable({ rows }: { rows: LoanRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 py-8">No loans found</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Loan Code</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Branch / Center</TableHead>
            <TableHead>Executive</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Doc Fee</TableHead>
            <TableHead className="text-right">Courier</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.loan_code}>
              <TableCell className="font-mono text-xs">{r.loan_code}</TableCell>
              <TableCell>
                <div className="font-medium text-sm">{r.customer_name}</div>
                <div className="text-xs text-gray-500 font-mono">
                  {r.customer_nic}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                {r.bname} / {r.center}
              </TableCell>
              <TableCell className="text-xs">{r.created_by || "—"}</TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.total_amount)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                Rs. {fmt(r.payment)}
              </TableCell>
              <TableCell className="text-right text-amber-600">
                Rs. {fmt(r.loan_balance)}
              </TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.document_fee)}
              </TableCell>
              <TableCell className="text-right">
                Rs. {fmt(r.courier_charge)}
              </TableCell>
              <TableCell className="text-xs">{r.loan_date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ProductReports;
