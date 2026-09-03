import { Menu, Search, User, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import NotificationBell from "./NotificationBell";

interface TopNavbarProps {
  onToggleSidebar: () => void;
}

const TopNavbar = ({ onToggleSidebar }: TopNavbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const roleColor: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    zone_head: "bg-purple-100 text-purple-700",
    regional_manager: "bg-orange-100 text-orange-700",
    branch_manager: "bg-teal-100 text-teal-700",
    executive: "bg-blue-100 text-blue-700",
    manager: "bg-blue-100 text-blue-700",
  };
  const roleBadge =
    roleColor[user?.status || ""] || "bg-slate-100 text-slate-600";

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 sticky top-0 z-30 shadow-sm">
      {/* Hamburger */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Menu size={20} className="text-foreground" />
      </button>

      {/* Search */}
      {/* <div className="flex-1 max-w-md flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search NIC or Customer Code..."
            className="w-full pl-4 pr-10 py-2 text-sm rounded-lg border border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
        </div>
        <button
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-colors shadow"
          onClick={handleSearch}
        >
          <Search size={16} />
        </button>
      </div> */}

      <div className="flex-1" />

      {/* ── Notification Bell (self-contained) ── */}
      {/* <NotificationBell /> */}

      {/* ── Profile Popover ── */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-border hover:bg-muted/50 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
            {/* Avatar initial */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-sm font-bold text-primary">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {user?.name}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                {user?.status?.replace(/_/g, " ")}
              </p>
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-56 p-0 shadow-xl rounded-xl overflow-hidden border border-border"
          align="end"
          sideOffset={8}
        >
          {/* Header — uses card bg + primary accent */}
          <div className="bg-card border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.name}
                </p>
                {user?.bname && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.bname}
                  </p>
                )}
                <p
                  className={`text-[10px] font-medium capitalize mt-0.5 ${roleBadge}`}
                >
                  {user?.status?.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1 bg-card">
            {/* <button
              onClick={() => navigate("/dashboard/my-profile")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User size={14} className="text-primary" />
              </div>
              <span>My Profile</span>
            </button>

            <button
              onClick={() => navigate("/dashboard/my-profile")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Settings size={14} className="text-muted-foreground" />
              </div>
              <span>Settings</span>
            </button> */}

            <Separator />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <LogOut size={14} className="text-destructive" />
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
};

export default TopNavbar;
