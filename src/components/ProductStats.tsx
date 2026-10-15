import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Wallet,
  Banknote,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle2,
  Loader2,
  Building2,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";

interface Stats {
  total_loans: number;
  total_amount: number;
  total_balance: number;
  total_paid: number;
  pending_count: number;
  delivered_count: number;
  pending_amount: number;
  delivered_amount: number;
}

interface BranchRow {
  bname: string;
  total_loans: number;
  total_amount: number;
  total_paid: number;
  total_balance: number;
  pending_count: number;
  delivered_count: number;
}

const fmtShort = (n: number) =>
  Number(n).toLocaleString("en-LK", { maximumFractionDigits: 0 });

const fmt = (n: number) =>
  Number(n).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ProductStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);

  const isExecutive =
    user?.status === "executive" || user?.status === "manager";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          role: user.status || "",
          user_id: user.id?.toString() || "",
          user_branch: user.bname || "",
        });
        const res = await fetch(
          `${API_BASE_URL}/report/product_stats?${params}`,
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load product stats");
        }
        if (cancelled) return;
        setStats(data.stats);
        setBranches(data.branches || []);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-sm text-gray-500">
            Loading product statistics...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center text-sm text-red-600">
          ⚠️ {error || "No data available"}
        </CardContent>
      </Card>
    );
  }

  const paidPct =
    stats.total_amount > 0
      ? Math.min(100, (stats.total_paid / stats.total_amount) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">
              Product Overview
            </h3>
            <p className="text-xs text-gray-500">
              {isExecutive
                ? "Your product loans"
                : "All product loans in scope"}
            </p>
          </div>
        </div>
      </div> */}

      {/* ── Top row: 4 primary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStat
          icon={Package}
          label="Total Loans"
          value={fmtShort(stats.total_loans)}
          sub={`${stats.pending_count} pending · ${stats.delivered_count} delivered`}
          tint="blue"
        />
        <BigStat
          icon={Wallet}
          label="Total Amount"
          value={`Rs. ${fmtShort(stats.total_amount)}`}
          sub={`Balance Rs. ${fmtShort(stats.total_balance)}`}
          tint="indigo"
        />
        <BigStat
          icon={Banknote}
          label="Total Paid"
          value={`Rs. ${fmtShort(stats.total_paid)}`}
          sub={`${paidPct.toFixed(0)}% recovered`}
          tint="green"
        />
        <BigStat
          icon={TrendingUp}
          label="Balance"
          value={`Rs. ${fmtShort(stats.total_balance)}`}
          sub="Still outstanding"
          tint="amber"
        />
      </div>

      {/* ── Second row: delivery status split ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatusTile
          icon={Clock}
          title="Pending Deliveries"
          count={stats.pending_count}
          amount={stats.pending_amount}
          tint="amber"
        />
        <StatusTile
          icon={Truck}
          title="Delivered Products"
          count={stats.delivered_count}
          amount={stats.delivered_amount}
          tint="green"
        />
      </div>

      {/* ── Branch-wise mini table (hidden for single-branch scope) ── */}
      {branches.length > 1 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-gray-700">
                Branch Breakdown
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">
                      Branch
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">
                      Loans
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">
                      Amount
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">
                      Paid
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">
                      Pending
                    </th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">
                      Delivered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b, i) => (
                    <tr
                      key={b.bname}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                    >
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {b.bname}
                      </td>
                      <td className="px-3 py-2 text-right">{b.total_loans}</td>
                      <td className="px-3 py-2 text-right">
                        Rs. {fmtShort(b.total_amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600 font-medium">
                        Rs. {fmtShort(b.total_paid)}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-600">
                        {b.pending_count}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-600">
                        {b.delivered_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ── Big stat card ── */
function BigStat({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tint: "blue" | "indigo" | "green" | "amber";
}) {
  const tints: Record<string, { bg: string; iconBg: string; text: string }> = {
    blue: {
      bg: "from-blue-50 to-white border-blue-100",
      iconBg: "bg-blue-100 text-blue-600",
      text: "text-blue-700",
    },
    indigo: {
      bg: "from-indigo-50 to-white border-indigo-100",
      iconBg: "bg-indigo-100 text-indigo-600",
      text: "text-indigo-700",
    },
    green: {
      bg: "from-green-50 to-white border-green-100",
      iconBg: "bg-green-100 text-green-600",
      text: "text-green-700",
    },
    amber: {
      bg: "from-amber-50 to-white border-amber-100",
      iconBg: "bg-amber-100 text-amber-600",
      text: "text-amber-700",
    },
  };
  const t = tints[tint];
  return (
    <Card
      className={`border bg-gradient-to-br ${t.bg} shadow-sm hover:shadow-md transition-shadow`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.iconBg}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className={`text-xl font-bold mt-0.5 ${t.text}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Delivery status tile ── */
function StatusTile({
  icon: Icon,
  title,
  count,
  amount,
  tint,
}: {
  icon: any;
  title: string;
  count: number;
  amount: number;
  tint: "amber" | "green";
}) {
  const isAmber = tint === "amber";
  return (
    <Card
      className={`border-0 shadow-sm overflow-hidden ${
        isAmber
          ? "bg-gradient-to-r from-amber-50 to-orange-50"
          : "bg-gradient-to-r from-green-50 to-emerald-50"
      }`}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isAmber
              ? "bg-amber-100 text-amber-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">
            {count}
          </p>
          <p
            className={`text-xs font-medium mt-0.5 ${
              isAmber ? "text-amber-700" : "text-green-700"
            }`}
          >
            Rs. {fmt(amount)}
          </p>
        </div>
        {count > 0 && (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAmber ? "bg-amber-100" : "bg-green-100"
            }`}
          >
            <CheckCircle2
              className={`w-4 h-4 ${
                isAmber ? "text-amber-500" : "text-green-500"
              }`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductStats;
