import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import FloatForm from "./FloatForm";
import OverviewStats from "./OverviewStats";
import CustomerProfile from "@/pages/CustomerProfile";
import ExecutiveOverview from "./ExecutiveOverview";
import RouteOverview from "../components/RouteOverview";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("search");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back,{" "}
          <span className="text-primary">{user?.name || "User"} !</span>
        </h1>
      </div>

      {/* <CustomerProfile initialSearch={searchTerm} />

      <FloatForm />

      <ExecutiveOverview />
      <OverviewStats />
      {(user?.status === "admin" ||
        user?.status === "zone_head" ||
        user?.status === "regional_manager") && <RouteOverview />} */}
    </div>
  );
};

export default Dashboard;
