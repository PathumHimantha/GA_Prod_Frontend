import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  TrendingUp,
  Users,
  Trophy,
  Briefcase,
  Landmark,
  AlertTriangle,
  Loader2,
  Star,
  Target,
  Zap,
  Award,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StatsData {
  monthly_lending_target: number;
  lending_achieved: number;
  active_customers: number;
  arrears_achieved: number;
  arrears_target: number;
  lending_points: number;
  new_customer_points: number;
  business_loan_points: number;
  outside_loan_points: number;
  arrears_points: number;
  total_points_earned: number;
  max_possible_points: number;
  month_name: string;
  executive_name: string;
  branch_name: string;
  days_passed: number;
  days_in_month: number;
  breakdown: {
    lending: {
      achieved: number;
      target: number;
      points: number;
      max_points: number;
    };
    new_customer: {
      achieved: number;
      target: number;
      current_active: number;
      points: number;
      max_points: number;
    };
    business_loan: {
      achieved: number;
      target: number;
      points: number;
      max_points: number;
    };
    outside_loan: {
      achieved: number;
      target: number;
      count: number;
      points: number;
      max_points: number;
    };
    arrears: {
      achieved: number;
      target: number;
      points: number;
      max_points: number;
    };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `Rs. ${(n / 1_000_000).toFixed(2)}M`
    : `Rs. ${n.toLocaleString("en-LK")}`;

const pct = (a: number, t: number) =>
  t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0;

// ── Radial Gauge Card ─────────────────────────────────────────────────────────
const RadialGaugeCard = ({
  title,
  subtitle,
  value,
  total,
  displayValue,
  displayLabel,
  color,
  icon: Icon,
  accentClass,
  footer,
}: {
  title: string;
  subtitle: string;
  value: number; // 0-100 for arc fill
  total: number;
  displayValue: string;
  displayLabel: string;
  color: string;
  icon: any;
  accentClass: string;
  footer?: string;
}) => {
  const chartData = [{ name: title, value, fill: color }];
  const chartConfig: ChartConfig = {
    value: { label: title, color },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${accentClass}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${color}18` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">{title}</p>
              <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
          </div>
          <div
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: `${color}15`, color }}
          >
            {value}%
          </div>
        </div>

        {/* Radial chart */}
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[180px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={-90}
            endAngle={-90 + (value / 100) * 360}
            outerRadius={80}
            innerRadius={64}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[80, 64]}
            />
            <RadialBar dataKey="value" background cornerRadius={12} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 8}
                          className="fill-foreground text-2xl font-bold"
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            fill: "#111827",
                          }}
                        >
                          {displayValue}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 14}
                          style={{ fontSize: 10, fill: "#9ca3af" }}
                        >
                          {displayLabel}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>

        {/* Footer */}
        {footer && (
          <p className="text-xs text-center text-gray-400 -mt-2">{footer}</p>
        )}
      </div>
    </div>
  );
};

// ── Rank Display ──────────────────────────────────────────────────────────────
const RankDisplay = ({
  rank,
  total,
  loading,
}: {
  rank: number | null;
  total: number;
  loading: boolean;
}) => {
  const getRankConfig = (r: number) => {
    if (r === 1)
      return {
        bg: "from-yellow-400 to-amber-500",
        text: "text-amber-900",
        label: "Champion",
      };
    if (r === 2)
      return {
        bg: "from-gray-300 to-gray-400",
        text: "text-gray-800",
        label: "Runner Up",
      };
    if (r === 3)
      return {
        bg: "from-amber-500 to-orange-600",
        text: "text-white",
        label: "3rd Place",
      };
    if (r && r <= 10)
      return {
        bg: "from-blue-400 to-blue-600",
        text: "text-white",
        label: "Top 10",
      };
    return {
      bg: "from-gray-200 to-gray-300",
      text: "text-gray-700",
      label: "Ranked",
    };
  };

  const cfg = rank ? getRankConfig(rank) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-purple-600" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Current Rank</p>
            <p className="text-xs text-gray-400">Among all executives</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            {/* Animated rank skeleton */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-200 to-purple-300 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">
                Calculating rank...
              </p>
              <div className="flex gap-1 justify-center mt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : rank ? (
          <div className="flex flex-col items-center">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${cfg!.bg} flex items-center justify-center shadow-lg mb-3`}
            >
              <span className={`text-3xl font-black ${cfg!.text}`}>
                #{rank}
              </span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${cfg!.bg} ${cfg!.text} mb-2`}
            >
              {cfg!.label}
            </span>
            <p className="text-xs text-gray-400">out of {total} executives</p>
            {/* Mini rank bar */}
            <div className="w-full mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${cfg!.bg} transition-all duration-1000`}
                style={{
                  width: `${Math.max(5, 100 - ((rank - 1) / total) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between w-full mt-1">
              <span className="text-xs text-gray-400">Top</span>
              <span className="text-xs text-gray-400">Last</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-gray-400">
            <Award className="w-10 h-10 mb-2" />
            <p className="text-sm">Not ranked yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ExecutiveOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [totalExecutives, setTotalExecutives] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRank, setLoadingRank] = useState(true);
  const [error, setError] = useState("");

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    if (!user?.id) return;
    setLoadingStats(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/ratings/get-stats?userId=${user.id}`,
      );
      const data = await res.json();
      if (res.ok && data.stats) setStats(data.stats);
      else setError("Failed to load stats");
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoadingStats(false);
    }
  };

  const RANK_CACHE_KEY = `exec_rank_${user?.id}`;
  const RANK_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  const fetchRank = async () => {
    if (!user?.id) return;

    // ── Check cache first ──────────────────────────────────────────────────
    try {
      const cached = localStorage.getItem(RANK_CACHE_KEY);
      if (cached) {
        const { rank: cachedRank, total, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < RANK_CACHE_TTL) {
          // Cache is fresh — use it, no API call needed
          setRank(cachedRank);
          setTotalExecutives(total);
          setLoadingRank(false);
          return;
        }
      }
    } catch {}

    // ── Cache miss or expired — fetch from API ─────────────────────────────
    setLoadingRank(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/ratings/all?page=1&limit=1000`,
      );
      const data = await res.json();
      if (res.ok && data.ratings) {
        const sorted = [...data.ratings].sort(
          (a: any, b: any) => b.total_points - a.total_points,
        );
        const idx = sorted.findIndex((r: any) => r.user_id === user.id);
        const newRank = idx >= 0 ? idx + 1 : null;
        const newTotal = sorted.length;

        setRank(newRank);
        setTotalExecutives(newTotal);

        // ── Save to cache ────────────────────────────────────────────────
        try {
          localStorage.setItem(
            RANK_CACHE_KEY,
            JSON.stringify({
              rank: newRank,
              total: newTotal,
              timestamp: Date.now(),
            }),
          );
        } catch {}
      }
    } catch {
    } finally {
      setLoadingRank(false);
    }
  };
  useEffect(() => {
    fetchStats();
    fetchRank(); // fires independently — doesn't block stats display
  }, [user?.id]);

  if (loadingStats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-700">
            {error || "No data available"}
          </p>
          <button
            onClick={() => {
              // Clear cache so refresh forces a fresh API call
              try {
                localStorage.removeItem(RANK_CACHE_KEY);
              } catch {}
              fetchStats();
              fetchRank();
            }}
            className="text-xs text-red-500 mt-1 flex items-center gap-1 hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { breakdown, month_name, days_passed, days_in_month } = stats;
  const lendingPct = pct(breakdown.lending.achieved, breakdown.lending.target);
  const customerPct = pct(breakdown.new_customer.current_active, 300); // visual max
  const pointsPct = Math.max(
    0,
    Math.round((stats.total_points_earned / stats.max_possible_points) * 100),
  );
  const arrearsPct = pct(breakdown.arrears.target, breakdown.arrears.achieved); // lower is better

  return (
    <div className="space-y-4">
      {/* Month + progress pill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-gray-700">
            {month_name}
          </span>
          <span className="text-xs text-gray-400">
            · Day {days_passed} of {days_in_month}
          </span>
        </div>
        <button
          onClick={() => {
            // Clear cache so refresh forces a fresh API call
            try {
              localStorage.removeItem(RANK_CACHE_KEY);
            } catch {}
            fetchStats();
            fetchRank();
          }}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* 4 gauge cards + rank */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Lending */}
        <RadialGaugeCard
          title="Lending"
          subtitle={`Target: ${fmt(breakdown.lending.target)}`}
          value={lendingPct}
          total={breakdown.lending.target}
          displayValue={`${lendingPct}%`}
          displayLabel="achieved"
          color="#6366f1"
          icon={TrendingUp}
          accentClass="bg-gradient-to-r from-indigo-400 to-violet-500"
          footer={`${fmt(breakdown.lending.achieved)} achieved`}
        />

        {/* Active Customers */}
        <RadialGaugeCard
          title="Customers"
          subtitle={`Active: ${stats.active_customers}`}
          value={Math.min(
            100,
            Math.round((stats.active_customers / 300) * 100),
          )}
          total={300}
          displayValue={String(stats.active_customers)}
          displayLabel="active"
          color="#10b981"
          icon={Users}
          accentClass="bg-gradient-to-r from-emerald-400 to-teal-500"
          footer={`+${breakdown.new_customer.achieved} new this month`}
        />

        {/* Arrears */}
        <RadialGaugeCard
          title="Arrears"
          subtitle={`Target: ${fmt(breakdown.arrears.target)}`}
          value={Math.min(
            100,
            Math.round(
              (breakdown.arrears.target /
                Math.max(1, breakdown.arrears.achieved)) *
                100,
            ),
          )}
          total={breakdown.arrears.target}
          displayValue={`${breakdown.arrears.points > 0 ? "+" : ""}${breakdown.arrears.points.toFixed(1)}`}
          displayLabel="pts"
          color={breakdown.arrears.points >= 0 ? "#10b981" : "#ef4444"}
          icon={AlertTriangle}
          accentClass={
            breakdown.arrears.points >= 0
              ? "bg-gradient-to-r from-green-400 to-emerald-500"
              : "bg-gradient-to-r from-red-400 to-rose-500"
          }
          footer={`Current: ${fmt(breakdown.arrears.achieved)}`}
        />
        {/* My Points */}
        <RadialGaugeCard
          title="My Points"
          subtitle={`Max: ${stats.max_possible_points}`}
          value={Math.max(0, pointsPct)}
          total={stats.max_possible_points}
          displayValue={stats.total_points_earned.toFixed(1)}
          displayLabel="pts"
          color="#f59e0b"
          icon={Star}
          accentClass="bg-gradient-to-r from-amber-400 to-orange-500"
          footer={`${pointsPct}% of max points`}
        />

        {/* Rank */}
        <RankDisplay
          rank={rank}
          total={totalExecutives}
          loading={loadingRank}
        />
      </div>
    </div>
  );
};

export default ExecutiveOverview;
