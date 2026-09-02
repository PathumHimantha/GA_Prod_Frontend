import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, BarChart3, ClipboardList, Building2 } from "lucide-react";
import { useState } from "react";

// Import the actual tab components
import BranchTab from "./branch-component/BranchTab";
import BranchDayTab from "./branch-component/BranchDayTab";
import AllBranchTab from "./branch-component/AllBranchTab";

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  {
    value: "branch-report",
    label: "Branch Report",
    icon: ClipboardList,
    component: BranchTab,
  },
  {
    value: "branch-day-end",
    label: "Branch Day End Report",
    icon: BarChart3,
    component: BranchDayTab,
  },
  {
    value: "all-branches",
    label: "All Branches Report",
    icon: Building2,
    component: AllBranchTab,
  },
];

const BranchReport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("branch-report");

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6 space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Branch Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage branch performance reports
            </p>
          </div>

          {/* Date badge */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">{dateStr}</span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
              {dayName}
            </span>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Tab triggers */}
          <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl shadow-sm border border-gray-200 bg-white flex items-center gap-2 text-sm font-medium transition-all"
              >
                <Icon className="w-4 h-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab content panels */}
          {TABS.map(({ value, component: Component }) => (
            <TabsContent key={value} value={value}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <Component />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default BranchReport;
