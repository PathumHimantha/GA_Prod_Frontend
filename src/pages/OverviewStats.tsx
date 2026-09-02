import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin,
  Users,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";
import { getOverviewStats } from "@/lib/floatsHelper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CenterDetail {
  center: string;
  ccode: string;
  bname: string;
  center_count: number; // rows in branch table (executives in that center)
  customer_count: number; // active customers (loan_balance != 0)
}

interface Stats {
  total_centers: number;
  total_customers: number;
  today_centers: number;
  today_customers: number;
  today_day: string;
  all_centers: CenterDetail[];
  today_centers_detail: CenterDetail[];
}

// ── Summary card ──────────────────────────────────────────────────────────────
const StatCard = ({
  title,
  value,
  sub,
  icon,
  color = "text-primary",
  bg = "bg-primary/10",
}: {
  title: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
  bg?: string;
}) => (
  <div className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {title}
        </p>
        <p className="text-2xl font-bold text-foreground mt-1">
          {(value ?? 0).toLocaleString()}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <div
        className={`w-11 h-11 rounded-lg ${bg} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
    </div>
  </div>
);

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-5 h-24 animate-pulse bg-gray-100"
        />
      ))}
    </div>
    <div className="h-48 rounded-xl border border-border animate-pulse bg-gray-100" />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const OverviewStats = () => {
  const { user } = useAuth();

  const isAdmin = user?.status === "admin";
  const isRegional =
    user?.status === "regional_manager" || user?.status === "zone_head";
  // Show branch column for roles that see multiple branches
  const showBranch = isAdmin || isRegional;

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "today">("today");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getOverviewStats({
      bname: user.bname,
      role: user.status,
      name: user.name,
      userid: user.id,
    })
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Skeleton />;
  if (!stats) return null;

  const summaryCards = [
    {
      title: "Total Centers",
      value: stats.total_centers,
      sub: "All assigned centers",
      icon: <MapPin size={20} className="text-primary" />,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Active Customers",
      value: stats.total_customers,
      sub: "Ongoing loans",
      icon: <Users size={20} className="text-green-600" />,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: `Today's Centers`,
      value: stats.today_centers,
      sub: stats.today_day,
      icon: <Calendar size={20} className="text-blue-600" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: `Today's Customers`,
      value: stats.today_customers,
      sub: "In today's centers",
      icon: <TrendingUp size={20} className="text-amber-600" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Center Overview</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
};

export default OverviewStats;
