import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Building2,
  User,
  ArrowRight,
  CalendarX,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";

interface Route {
  bname: string;
  bcode: string;
  executive_name: string;
  assigned: string | null;
  on_leave: boolean;
  on_holiday: boolean;
  holiday_name: string | null;
  status: "Done" | "In Progress" | "Leave" | "Pending" | "Holiday";
  center_count: number;
}

interface Summary {
  total: number;
  done: number;
  in_progress: number;
  on_leave: number;
  pending: number;
  holiday?: number;
}

const statusConfig = {
  Done: {
    className: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  "In Progress": {
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="w-3 h-3" />,
  },
  Leave: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  Pending: {
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  Holiday: {
    className: "bg-violet-100 text-violet-700 border-violet-200",
    icon: <Calendar className="w-3 h-3" />,
  },
};

const RouteOverview = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [day, setDay] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const isAllowed =
    user?.status === "admin" ||
    user?.status === "zone_head" ||
    user?.status === "regional_manager";

  const fetchRoutes = async (targetDate: string) => {
    if (!isAllowed) return;
    setLoading(true);
    setError("");
    setIsHoliday(false);
    setHolidayName("");
    try {
      const params = new URLSearchParams({
        date: targetDate,
        role: user?.status || "",
        userid: user?.id?.toString() || "",
        bname: user?.bname || "",
      });
      const res = await fetch(
        `${API_BASE_URL}/api/floats/route_overview?${params}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setRoutes(data.routes || []);
      setSummary(data.summary || null);
      setDay(data.day || "");
      setIsHoliday(data.is_holiday || false);
      setHolidayName(data.holiday_name || "");
    } catch (err: any) {
      setError(err.message || "Failed to load route overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) fetchRoutes(date);
  }, [date, user]);

  const filtered = routes.filter(
    (r) =>
      r.executive_name.toLowerCase().includes(search.toLowerCase()) ||
      r.bname.toLowerCase().includes(search.toLowerCase()) ||
      r.bcode.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by branch
  const grouped = filtered.reduce(
    (acc, r) => {
      if (!acc[r.bname]) acc[r.bname] = { bcode: r.bcode, routes: [] };
      acc[r.bname].routes.push(r);
      return acc;
    },
    {} as Record<string, { bcode: string; routes: Route[] }>,
  );

  // Check if all executives in a branch are on holiday
  const isBranchOnHoliday = (routes: Route[]) => {
    return routes.every((r) => r.on_holiday === true);
  };

  // Get holiday name for a branch
  const getBranchHolidayName = (routes: Route[]) => {
    const holidayRoute = routes.find((r) => r.holiday_name);
    return holidayRoute?.holiday_name || "Branch Holiday";
  };

  if (!isAllowed) return null;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        {/* Date + Day header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Route Overview
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Field executive routes and submission status
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm w-fit">
            <Calendar className="w-4 h-4 text-primary" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm font-medium text-gray-700 border-none outline-none bg-transparent"
            />
            {day && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                {day}
              </span>
            )}
          </div>
        </div>

        {/* Summary pills */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                label: "Total Routes",
                value: summary.total,
                color: "bg-purple-100 text-purple-700",
              },
              {
                label: "Done",
                value: summary.done,
                color: "bg-green-100 text-green-700",
              },
              {
                label: "In Progress",
                value: summary.in_progress,
                color: "bg-blue-100 text-blue-700",
              },
              {
                label: "On Leave",
                value: summary.on_leave,
                color: "bg-amber-100 text-amber-700",
              },
              {
                label: "Pending",
                value: summary.pending,
                color: "bg-rose-100 text-rose-700",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className={`${color} rounded-xl px-3 py-2 text-center`}
              >
                <p className="text-lg font-bold">{value}</p>
                <p className="text-xs font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by executive or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-200"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Grouped route list */}
        {!loading && (
          <div className="space-y-4">
            {Object.entries(grouped).map(
              ([bname, { bcode, routes: bRoutes }]) => {
                // Check if entire branch is on holiday
                const branchOnHoliday = isBranchOnHoliday(bRoutes);
                const holidayName = getBranchHolidayName(bRoutes);

                return (
                  <Card
                    key={bname}
                    className={`border-0 shadow-md overflow-hidden ${
                      branchOnHoliday ? "border-l-4 border-l-violet-400" : ""
                    }`}
                  >
                    {/* Branch header */}
                    <div
                      className={`px-4 py-3 flex items-center justify-between ${
                        branchOnHoliday
                          ? "bg-gradient-to-r from-violet-50 via-violet-100/30 to-transparent"
                          : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2
                          className={`w-4 h-4 ${
                            branchOnHoliday ? "text-violet-500" : "text-primary"
                          }`}
                        />
                        <span className="text-sm font-bold text-gray-800">
                          {bname}
                        </span>
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">
                          {bcode}
                        </Badge>
                        {branchOnHoliday && (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs flex items-center gap-1">
                            <CalendarX className="w-3 h-3" />
                            Holiday
                          </Badge>
                        )}
                      </div>
                      {!branchOnHoliday && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {bRoutes.length} executive
                            {bRoutes.length !== 1 ? "s" : ""}
                          </span>
                          <span>·</span>
                          <span className="text-green-600 font-medium">
                            {bRoutes.filter((r) => r.status === "Done").length}{" "}
                            done
                          </span>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-0">
                      {branchOnHoliday ? (
                        // ── Branch Holiday Display ──
                        <div className="bg-gradient-to-r from-violet-50/50 to-purple-50/50 p-5 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <CalendarX className="w-6 h-6 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-violet-800">
                              {bname} Branch Holiday
                            </p>
                            <p className="text-sm text-violet-600 mt-0.5">
                              {holidayName} — no routes scheduled for {date} in{" "}
                              {bname} Branch.
                            </p>
                          </div>
                        </div>
                      ) : (
                        // ── Regular Route List ──
                        bRoutes.map((route, idx) => {
                          const cfg = statusConfig[route.status];
                          return (
                            <div
                              key={`${route.executive_name}-${idx}`}
                              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 ${
                                route.status === "Done" ? "bg-green-50/30" : ""
                              }`}
                            >
                              {/* Avatar */}
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>

                              {/* Executive info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {route.executive_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">
                                    {route.center_count} center
                                    {route.center_count !== 1 ? "s" : ""}
                                  </span>
                                  {route.on_leave && route.assigned && (
                                    <>
                                      <span className="text-gray-300">·</span>
                                      <span className="text-xs text-amber-600 flex items-center gap-1">
                                        <ArrowRight className="w-3 h-3" />
                                        {route.assigned}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Status badge */}
                              <Badge
                                className={`text-xs border flex items-center gap-1 ${cfg.className}`}
                              >
                                {cfg.icon}
                                {route.status}
                              </Badge>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              },
            )}

            {/* Company-wide Holiday */}
            {isHoliday && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-violet-800">
                    Company-wide Holiday
                  </p>
                  <p className="text-sm text-violet-600 mt-0.5">
                    {holidayName || "All branches are on holiday"} — no routes
                    scheduled for {date}.
                  </p>
                </div>
              </div>
            )}

            {!loading && Object.keys(grouped).length === 0 && !isHoliday && (
              <Card className="border-0 shadow-md">
                <CardContent className="p-10 text-center">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">
                    No routes found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    No executives are scheduled for {day || "this day"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteOverview;
