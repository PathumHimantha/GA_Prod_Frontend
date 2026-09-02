import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  UserCircle,
  Building2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { fetchBranches, Branch } from "@/lib/branchHelpers";
import { submitFloat } from "@/lib/floatsHelper";
import SearchableSelect from "@/components/SearchableSelect";
import { API_BASE_URL } from "@/apiConfig";

const FloatForm = () => {
  const { user } = useAuth();
  const getEffectiveDate = () => {
    const today = new Date();
    if (today.getDay() === 6) {
      // 6 = Saturday
      today.setDate(today.getDate() - 1);
    }
    return today.toISOString().split("T")[0];
  };
  const dateStr = getEffectiveDate();

  // const dateStr = new Date().toISOString().split("T")[0];
  const [availableFloat, setAvailableFloat] = useState<number | null>(null);
  const [loadingFloat, setLoadingFloat] = useState(false);
  const [plot, setPlot] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(user?.bname || "");
  const [branchOptions, setBranchOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New states for last week summary check
  const [lastWeekSubmitted, setLastWeekSubmitted] = useState<boolean | null>(
    null,
  ); // null = unknown
  const [checkingLastWeek, setCheckingLastWeek] = useState<boolean>(false);
  const [lastWeekData, setLastWeekData] = useState<any>(null);

  // Determine if user has branch selection access
  const canSelectBranch =
    user?.status === "regional_manager" ||
    user?.status === "branch_manager" ||
    user?.status === "executive" ||
    user?.status === "zone_head" ||
    user?.status === "admin";

  useEffect(() => {
    if (!user) return;
    fetchBranches({
      role: user.status,
      userId: user.id.toString(),
      bname: user.bname,
    }).then((branches: Branch[]) => {
      setBranchOptions(
        branches.map((b) => ({ label: b.bname, value: b.bname, sub: b.bcode })),
      );
    });
  }, [user]);

  useEffect(() => {
    if (!selectedBranch || !user) return;
    const fetchWeekly = async () => {
      setLoadingFloat(true);
      try {
        const params = new URLSearchParams({
          date: dateStr,
          branch: selectedBranch,
          role: user.status || "",
          userid: user.id?.toString() || "",
          bname: user.bname || "",
        });
        const res = await fetch(
          `${API_BASE_URL}/api/cashier/get_weekly_summary?${params}`,
        );
        const data = await res.json();
        setAvailableFloat(data.grand_totals?.week_end_cash_balance ?? null);
      } catch {
        setAvailableFloat(null);
      } finally {
        setLoadingFloat(false);
      }
    };
    fetchWeekly();
  }, [selectedBranch, dateStr, user]);

  // New effect to check last week summary submission
  useEffect(() => {
    const checkLastWeekSubmission = async () => {
      if (!selectedBranch || !user) return;

      setCheckingLastWeek(true);
      try {
        const response = await fetch(
          `https://application.goldenasia.lk/api/api/helper/check_last_week_summary_submission?bname=${selectedBranch}&date=${dateStr}`,
        );
        const data = await response.json();
        setLastWeekData(data);
        setLastWeekSubmitted(data.submitted);
      } catch (error) {
        console.error("Error checking last week submission:", error);
        // If API fails, assume it's submitted to allow form to work
        setLastWeekSubmitted(true);
      } finally {
        setCheckingLastWeek(false);
      }
    };

    checkLastWeekSubmission();
  }, [selectedBranch, dateStr, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if last week summary was submitted
    if (lastWeekSubmitted === false) {
      setErrorMessage(
        "Last week summary must be submitted before submitting float.",
      );
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }

    if (!plot || !selectedBranch) return;
    if (availableFloat !== null && parseFloat(plot) > availableFloat) {
      setErrorMessage(
        `Float amount exceeds available balance of Rs. ${Number(availableFloat).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`,
      );
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }
    setSubmitting(true);
    const result = await submitFloat({
      date: dateStr,
      executive_name: user?.name || "",
      bname: selectedBranch,
      plot: parseFloat(plot),
    });
    setSubmitting(false);

    if (result.success) {
      setSuccessMessage("Float submitted successfully!");
      setPlot("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      setErrorMessage(result.error || "Failed to submit float.");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  // Check if form should be disabled - only when we know it's not submitted
  const isFormDisabled = lastWeekSubmitted === false || checkingLastWeek;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
      {/* Alerts */}
      {successMessage && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Warning: Last Week Summary Not Submitted */}
      {lastWeekSubmitted === false && lastWeekData && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-800">
                Last Week Summary Not Submitted
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                You must submit the weekly summary for{" "}
                <span className="font-semibold">
                  {lastWeekData.last_week_start} to {lastWeekData.last_week_end}
                </span>{" "}
                before you can submit a float for branch:{" "}
                <strong>{selectedBranch}</strong>.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-md">
                  <Calendar size={12} className="text-amber-600" />
                  Week: {lastWeekData.last_week_start} -{" "}
                  {lastWeekData.last_week_end}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-md">
                  <Building2 size={12} className="text-amber-600" />
                  Branch:{" "}
                  <span className="font-semibold">{selectedBranch}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-md">
                  <AlertCircle size={12} className="text-amber-600" />
                  Status:{" "}
                  <span className="font-semibold text-red-600">
                    Not Submitted
                  </span>
                </span>
              </div>
            </div>
            <Lock size={20} className="text-amber-600 shrink-0" />
          </div>
        </div>
      )}

      {/* Loading state for checking */}
      {checkingLastWeek && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-sm text-blue-700">
            Checking last week submission status for {selectedBranch}...
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        {/* Date — read only */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Date
          </label>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="date"
              value={dateStr}
              readOnly
              disabled={isFormDisabled}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-gray-50 text-foreground text-sm cursor-not-allowed"
            />
          </div>
        </div>

        {/* Executive Name — read only */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Executive Name
          </label>
          <div className="relative">
            <UserCircle
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              value={user?.name || ""}
              readOnly
              disabled={isFormDisabled}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-gray-50 text-foreground text-sm cursor-not-allowed"
            />
          </div>
        </div>

        {/* Branch — searchable dropdown */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Branch
          </label>
          <SearchableSelect
            options={branchOptions}
            value={selectedBranch}
            onChange={(value) => {
              setSelectedBranch(value);
              // Reset the submission status when branch changes
              setLastWeekSubmitted(null);
              setLastWeekData(null);
            }}
            placeholder="Select branch"
            disabled={!canSelectBranch} // Only disable if user doesn't have permission
          />
          {!canSelectBranch && (
            <p className="text-xs text-gray-400 mt-1">
              Branch selection is restricted to Regional Managers, Zone Heads,
              and Admins
            </p>
          )}
        </div>

        {/* Available Float Display */}
        {selectedBranch && (
          <div className="w-full">
            <div
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm
              ${
                availableFloat !== null && availableFloat <= 0
                  ? "bg-red-50 border-red-200"
                  : "bg-emerald-50 border-emerald-200"
              }
              ${isFormDisabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2">
                <DollarSign
                  size={15}
                  className={
                    availableFloat !== null && availableFloat <= 0
                      ? "text-red-500"
                      : "text-emerald-600"
                  }
                />
                <span className="text-xs font-medium text-gray-600">
                  Available Float — {selectedBranch}
                </span>
              </div>
              {loadingFloat ? (
                <span className="text-xs text-gray-400 animate-pulse">
                  Calculating...
                </span>
              ) : availableFloat !== null ? (
                <span
                  className={`font-bold text-sm ${availableFloat <= 0 ? "text-red-600" : "text-emerald-700"}`}
                >
                  Rs.{" "}
                  {Number(availableFloat).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>
          </div>
        )}

        {/* Float Amount */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Float (Rs.)
          </label>
          <div className="relative">
            <DollarSign
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="number"
              value={plot}
              onChange={(e) => setPlot(e.target.value)}
              disabled={isFormDisabled}
              className={`w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50
                ${isFormDisabled ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}`}
              placeholder="0.00"
              step="0.01"
              min="0"
              required={!isFormDisabled}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="min-w-[110px]">
          <button
            type="submit"
            disabled={submitting || isFormDisabled}
            className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors
              ${
                isFormDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
          >
            {isFormDisabled ? (
              <>
                <Lock size={16} />
                Locked
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                {submitting ? "Submitting..." : "Submit"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FloatForm;
