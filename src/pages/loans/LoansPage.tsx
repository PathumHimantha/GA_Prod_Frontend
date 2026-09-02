import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, UserCheck, AlertTriangle } from "lucide-react";
import NewLoan from "./NewLoan";
import RenewLoan from "./RenewLoan";
import { useAuth } from "@/contexts/AuthContext";
import { APP_API_BASE_URL } from "@/apiConfig";

const LoansPage = () => {
  const { category } = useParams<{ category: string }>();
  const { user } = useAuth();
  const isBusiness = category === "business";
  const isDaily = category === "daily";
  const [innerTab, setInnerTab] = useState<"new" | "renew">("new");

  const today = new Date().toISOString().split("T")[0];
  const [canSubmitLoan, setCanSubmitLoan] = useState(false);
  const [checkingFloat, setCheckingFloat] = useState(true);
  const [floatReason, setFloatReason] = useState("");

  useEffect(() => {
    if (!user) return;
    const checkFloat = async () => {
      setCheckingFloat(true);
      try {
        const params = new URLSearchParams({
          bname: user.bname || "",
          name: user.name || "",
          userid: user.id?.toString() || "",
          date: today,
        });
        const res = await fetch(
          `${APP_API_BASE_URL}/api/helper/check_float_submission?${params}`,
        );
        const data = await res.json();
        setCanSubmitLoan(data.can_add === true);
        setFloatReason(data.reason || "");
      } catch {
        setCanSubmitLoan(false);
        setFloatReason("Cannot connect to server");
      } finally {
        setCheckingFloat(false);
      }
    };
    checkFloat();
  }, [user, today]);

  const baseTitle = isBusiness
    ? "Business Loans"
    : isDaily
      ? "Daily Loans"
      : "Consumer Loans";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          {baseTitle}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage {isBusiness ? "business" : isDaily ? "daily" : "consumer"} loan
          applications and renewals
        </p>
      </div>

      {/* ── Float Warning Banner ── */}
      {!checkingFloat && !canSubmitLoan && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Loan Submission Disabled
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {floatReason ||
                "Float record not found for today. Please contact your branch manager."}
            </p>
          </div>
        </div>
      )}

      <Tabs
        value={innerTab}
        onValueChange={(v) => setInnerTab(v as "new" | "renew")}
      >
        <TabsList className="w-full sm:w-auto gap-1 bg-muted p-1 rounded-xl">
          <TabsTrigger
            value="new"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Briefcase size={16} />
            New Loan
          </TabsTrigger>
          <TabsTrigger
            value="renew"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <UserCheck size={16} />
            Renew Loan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <NewLoan
            isBusiness={isBusiness}
            isDaily={isDaily}
            canSubmitLoan={canSubmitLoan}
            checkingFloat={checkingFloat}
          />
        </TabsContent>

        <TabsContent value="renew" className="mt-4">
          <RenewLoan
            isBusiness={isBusiness}
            isDaily={isDaily}
            canSubmitLoan={canSubmitLoan}
            checkingFloat={checkingFloat}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoansPage;
