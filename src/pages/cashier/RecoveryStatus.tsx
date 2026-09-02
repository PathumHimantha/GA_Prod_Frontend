import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  AlertTriangle,
  FileText,
  Shield,
} from "lucide-react";
// add this import at the top of the chart
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { API_BASE_URL } from "@/apiConfig";

interface RecoveryStatusProps {
  loan_code: string;
  customer_code: string;
}

interface RecoveryData {
  paymentChart: {
    month_key: string;
    month_label: string;
    total_paid: number;
    payment_count: number;
  }[];
  arrears: number;
  totalExpected: number;
  loanInfo: {
    payment: number;
    week_payment: number;
    loan_balance: number;
    full_loan: number;
  };
  executiveFollowup: {
    visit_executive: string;
    visit_date: string;
    created_at: string;
  } | null;
  managerFollowup: {
    visit_executive: string;
    visit_date: string;
    created_at: string;
  } | null;
  letter1: { printed_at: string } | null;
  letter2: { printed_at: string } | null;
}

const fmt = (n: number) =>
  `Rs. ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateStr = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const chartConfig = {
  total_paid: { label: "Paid (Rs.)", color: "hsl(142, 76%, 36%)" },
  payment_count: { label: "Payments", color: "var(--chart-2)" },
} satisfies ChartConfig;

const TimelineItem = ({
  done,
  label,
  date,
  icon: Icon,
  color,
}: {
  done: boolean;
  label: string;
  date?: string;
  icon: any;
  color: string;
}) => (
  <div className="flex items-start gap-3">
    <div
      className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        done ? color : "bg-gray-100"
      }`}
    >
      <Icon className={`w-4 h-4 ${done ? "text-white" : "text-gray-400"}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p
        className={`text-sm font-semibold ${done ? "text-gray-800" : "text-gray-400"}`}
      >
        {label}
      </p>
      {done && date && (
        <p className="text-xs text-gray-500 mt-0.5">{dateStr(date)}</p>
      )}
      {!done && <p className="text-xs text-gray-400 mt-0.5">Not yet</p>}
    </div>
    <div className="flex-shrink-0 mt-1">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-300" />
      )}
    </div>
  </div>
);

const RecoveryStatus = ({ loan_code, customer_code }: RecoveryStatusProps) => {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loan_code) return;
    setLoading(true);
    setError("");

    fetch(
      `${API_BASE_URL}/api/customers/recovery-status/${encodeURIComponent(loan_code)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
        else setError(d.error || "Failed to load recovery status");
      })
      .catch(() => setError("Cannot connect to server"))
      .finally(() => setLoading(false));
  }, [loan_code]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Clock className="w-8 h-8 animate-pulse" />
            <p className="text-sm">Loading recovery status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-sm text-red-500">{error || "No data found"}</p>
        </CardContent>
      </Card>
    );
  }

  const {
    paymentChart,
    arrears,
    totalExpected,
    loanInfo,
    executiveFollowup,
    managerFollowup,
    letter1,
    letter2,
  } = data;

  // Recovery stage: 0=no action, 1=ex followup, 2=mg followup, 3=letter1, 4=letter2
  const stage = letter2
    ? 4
    : letter1
      ? 3
      : managerFollowup
        ? 2
        : executiveFollowup
          ? 1
          : 0;
  const stageLabels = [
    "No Action",
    "Executive Visit",
    "Manager Visit",
    "1st Letter Sent",
    "2nd Letter Sent",
  ];
  const stageColors = [
    "bg-gray-200",
    "bg-blue-500",
    "bg-amber-500",
    "bg-orange-500",
    "bg-red-600",
  ];

  // Chart trend — update these two lines
  const lastTwo = paymentChart.slice(-2);
  const trend =
    lastTwo.length === 2
      ? ((lastTwo[1].total_paid - lastTwo[0].total_paid) /
          (lastTwo[0].total_paid || 1)) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* ── Stage Banner ── */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className={`h-2 ${stageColors[stage]}`} />
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Current Recovery Stage
              </p>
              <div className="flex items-center gap-2">
                <Shield
                  className={`w-5 h-5 ${stage === 0 ? "text-gray-400" : stage < 3 ? "text-amber-500" : "text-red-500"}`}
                />
                <span className="text-lg font-bold text-gray-800">
                  {stageLabels[stage]}
                </span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="text-center px-4 py-2 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-500">Arrears</p>
                <p className="text-base font-bold text-red-600">
                  {fmt(arrears)}
                </p>
              </div>
              <div className="text-center px-4 py-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Expected</p>
                <p className="text-base font-bold text-amber-600">
                  {fmt(totalExpected)}
                </p>
              </div>
              <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-base font-bold text-green-600">
                  {fmt(loanInfo.payment || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Payment Chart ── */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Weekly Payment Activity
            </CardTitle>
            <CardDescription>
              Week-by-week payments for loan {loan_code}
            </CardDescription>
          </CardHeader>
          <CardContent className="pr-6 pb-2">
            {paymentChart.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No payment data available
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart
                  accessibilityLayer
                  data={paymentChart}
                  margin={{ left: 16, right: 16, top: 30, bottom: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <YAxis
                    hide={true}
                    domain={([, dataMax]) => [0, dataMax * 1.35]}
                  />
                  <XAxis
                    dataKey="week_label"
                    tickLine={true}
                    axisLine={false}
                    tickMargin={10}
                    interval={
                      paymentChart.length > 12
                        ? Math.floor(paymentChart.length / 8)
                        : 0
                    }
                    tickFormatter={(_, index) => `W-${index + 1}`}
                  />
                  <ChartTooltip
                    cursor={{
                      stroke: "var(--color-total_paid)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          `Rs. ${Number(value).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        }
                      />
                    }
                  />
                  <defs>
                    <linearGradient id="fillPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-total_paid)"
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-total_paid)"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="total_paid"
                    type="monotone"
                    fill="url(#fillPaid)"
                    fillOpacity={1}
                    stroke="var(--color-total_paid)"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, key } = props;
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="white"
                          stroke="var(--color-total_paid)"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{
                      r: 6,
                      fill: "var(--color-total_paid)",
                      stroke: "white",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
          {paymentChart.length >= 2 && (
            <CardFooter className="pt-2 pb-4 px-6">
              <div className="flex w-full items-start gap-2 text-sm">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2 font-medium leading-none">
                    {trend >= 0
                      ? `Up ${trend.toFixed(1)}% vs previous week`
                      : `Down ${Math.abs(trend).toFixed(1)}% vs previous week`}
                    <TrendingUp
                      className={`h-4 w-4 ${trend >= 0 ? "text-green-500" : "text-red-500 rotate-180"}`}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {paymentChart[0]?.week_label} —{" "}
                    {paymentChart.at(-1)?.week_label}
                  </div>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* ── Recovery Timeline ── */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recovery Timeline
            </CardTitle>
            <CardDescription>
              Step-by-step recovery actions taken
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Step connector line */}
              <div className="relative pl-4">
                <div className="absolute left-7 top-8 bottom-8 w-px bg-gray-200" />
                <div className="space-y-5">
                  <TimelineItem
                    done={!!executiveFollowup}
                    label="Executive Follow-up Visit"
                    date={executiveFollowup?.visit_date}
                    icon={User}
                    color="bg-blue-500"
                  />
                  {executiveFollowup && (
                    <div className="ml-11 -mt-3 mb-2">
                      <Badge className="bg-blue-50 text-blue-700 text-xs font-normal">
                        By: {executiveFollowup.visit_executive}
                      </Badge>
                    </div>
                  )}

                  <TimelineItem
                    done={!!managerFollowup}
                    label="Manager Follow-up Visit"
                    date={managerFollowup?.visit_date}
                    icon={Shield}
                    color="bg-amber-500"
                  />
                  {managerFollowup && (
                    <div className="ml-11 -mt-3 mb-2">
                      <Badge className="bg-amber-50 text-amber-700 text-xs font-normal">
                        Assigned: {managerFollowup.visit_executive}
                      </Badge>
                    </div>
                  )}

                  <TimelineItem
                    done={!!letter1}
                    label="1st Reminder Letter Sent"
                    date={letter1?.printed_at}
                    icon={Mail}
                    color="bg-orange-500"
                  />

                  <TimelineItem
                    done={!!letter2}
                    label="2nd Reminder Letter Sent"
                    date={letter2?.printed_at}
                    icon={FileText}
                    color="bg-red-600"
                  />
                </div>
              </div>
            </div>
          </CardContent>

          {/* Arrears warning */}
          {arrears > 0 && (
            <div className="mx-6 mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 leading-relaxed">
                Outstanding arrears of <strong>{fmt(arrears)}</strong> remain
                unpaid.
                {!executiveFollowup &&
                  " No recovery action has been taken yet."}
                {letter2 && " Final notice has been issued."}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RecoveryStatus;
