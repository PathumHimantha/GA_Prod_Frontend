import {
  FileText,
  MapPin,
  LogOut,
  User,
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Receipt,
  Printer,
  Package,
  Boxes,
  ShoppingBag,
  FileSpreadsheet,
  DollarSign,
  ClipboardCheck,
  TrendingUp,
  Store,
  PackageSearch,
  ClipboardList,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarMenuGroup, type MenuGroup } from "./SidebarMenu";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

/* ---------------- MENU CONFIG ---------------- */

type MenuSection = "customer" | "crew";

interface SectionedMenuGroup extends MenuGroup {
  section: MenuSection;
  roles?: string[];
}

const menuGroups: SectionedMenuGroup[] = [
  // ================= CUSTOMER SECTION =================
  {
    section: "customer",
    label: "Products Dashboard",
    icon: LayoutDashboard,
    items: [
      { label: "Products", path: "/dashboard/products", icon: Package },
      {
        label: "Product Cart",
        path: "/dashboard/product-cart",
        icon: ShoppingCart,
      },
      {
        label: "Product Tracking",
        path: "/dashboard/product-tracking",
        icon: MapPin,
      },
    ],
  },
  {
    section: "customer",
    label: "Products Payments",
    icon: CreditCard,
    items: [
      {
        label: "Payments",
        path: "/dashboard/product-payments",
        icon: DollarSign,
      },
      {
        label: "Single Payments",
        path: "/dashboard/single-payments",
        icon: Receipt,
      },
    ],
  },
  {
    section: "customer",
    label: "Documents Print",
    icon: Printer,
    items: [
      {
        label: "Purchase Agreement",
        path: "/dashboard/print-docs",
        icon: FileText,
      },
      {
        label: "Print Products",
        path: "/dashboard/print-products",
        icon: TrendingUp,
      },
    ],
  },
  {
    section: "customer",
    label: "Products",
    icon: Package,
    items: [
      {
        label: "Manage Products",
        path: "/dashboard/products/manage",
        icon: Package,
        roles: ["admin"],
      },
      {
        label: "Manage Stocks",
        path: "/dashboard/products/stocks",
        icon: Boxes,
        roles: ["admin"],
      },
      {
        label: "Manage Orders",
        path: "/dashboard/orders",
        icon: ShoppingBag,
        roles: ["admin"],
      },
      {
        label: "Requested Products",
        path: "/dashboard/requested-products",
        icon: ShoppingBag,
        roles: ["admin"],
      },
    ],
  },
  {
    section: "customer",
    label: "Products Reports",
    icon: FileSpreadsheet,
    items: [
      {
        label: "Product Repayment",
        path: "/dashboard/product-repayments",
        icon: ClipboardCheck,
      },
      {
        label: "Daily Report",
        path: "/dashboard/daily-report",
        icon: ClipboardCheck,
      },
      {
        label: "Product Reports",
        path: "/dashboard/product-reports",
        icon: ClipboardCheck,
      },
      {
        label: "Center Payments",
        path: "/dashboard/center-payments",
        icon: ClipboardCheck,
      },
    ],
  },

  // ================= CREW / STAFF SECTION =================
  {
    section: "crew",
    label: "Staff Store",
    icon: Store,
    // roles: ["admin", "staff", "crew", "executive"],
    items: [
      {
        label: "Browse Products",
        path: "/dashboard/staff-store",
        icon: PackageSearch,
      },
      {
        label: "Buy for Myself",
        path: "/dashboard/buy",
        icon: ShoppingCart,
      },
      {
        label: "My Orders",
        path: "/dashboard/my-orders",
        icon: ClipboardList,
      },
    ],
  },
  {
    section: "crew",
    label: "Team",
    icon: Users,
    roles: ["admin"],
    items: [
      {
        label: "Staff Purchases",
        path: "/dashboard/staff-purchases",
        icon: ClipboardCheck,
      },
      {
        label: "Staff Requests",
        path: "/dashboard/staff-requests",
        icon: ClipboardCheck,
      },
      {
        label: "Manage Orders",
        path: "/dashboard/manage-orders",
        icon: ClipboardCheck,
      },
    ],
  },
];

/* ---------------- COMPONENT ---------------- */

interface AppSidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
    {children}
  </p>
);

const AppSidebar = ({ collapsed, onClose }: AppSidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /* ---- role resolution: use whichever field the auth context actually fills ---- */
  const rawRole =
    (user as any)?.role ??
    (user as any)?.status ??
    (user as any)?.userType ??
    "";

  const currentRole = String(rawRole).toLowerCase();

  const visibleGroups = menuGroups.filter((g) => {
    if (!g.roles) return true;
    return g.roles.map((r) => r.toLowerCase()).includes(currentRole);
  });

  const customerGroups = visibleGroups.filter((g) => g.section === "customer");
  const crewGroups = visibleGroups.filter((g) => g.section === "crew");

  return (
    <aside
      className={`h-full bg-sidebar flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 p-4 border-b border-sidebar-border cursor-pointer"
        onClick={() => handleNavigate("/dashboard")}
      >
        <img
          src={logo}
          alt="GA"
          className="w-14 h-14 rounded-lg flex-shrink-0"
        />
        {!collapsed && (
          <div>
            <h2 className="text-lg font-bold text-sidebar-primary">
              Golden Asia
            </h2>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hidden">
        {/* CUSTOMER SECTION */}
        {customerGroups.length > 0 && (
          <>
            {!collapsed && <SectionLabel>Customer</SectionLabel>}
            {customerGroups.map((group, i) => (
              <SidebarMenuGroup
                key={`c-${group.label}-${i}`}
                group={group}
                collapsed={collapsed}
                activePath={location.pathname}
                onNavigate={handleNavigate}
              />
            ))}
          </>
        )}

        {/* DIVIDER */}
        {customerGroups.length > 0 && crewGroups.length > 0 && (
          <div className="my-3 border-t border-sidebar-border" />
        )}

        {/* CREW / STAFF SECTION */}
        {crewGroups.length > 0 && (
          <>
            {!collapsed && (
              <SectionLabel>Company Crew &amp; Staff</SectionLabel>
            )}
            {crewGroups.map((group, i) => (
              <SidebarMenuGroup
                key={`s-${group.label}-${i}`}
                group={group}
                collapsed={collapsed}
                activePath={location.pathname}
                onNavigate={handleNavigate}
              />
            ))}
          </>
        )}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="flex-1 text-left">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.name}
              </p>
              <p className="text-[10px] text-sidebar-muted capitalize">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
          )}
          <LogOut size={16} className="text-sidebar-muted" />
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
