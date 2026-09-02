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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarMenuGroup, type MenuGroup } from "./SidebarMenu";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";

const menuGroups: MenuGroup[] = [
  {
    label: "Products Dashboard",
    icon: LayoutDashboard,
    items: [
      {
        label: "Products",
        path: "/dashboard/products",
        icon: Package,
      },
      {
        label: "Product Cart",
        path: "/dashboard/product-cart",
        icon: ShoppingCart,
      },
    ],
  },
  {
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
    label: "Documents Print",
    icon: Printer,
    items: [
      {
        label: "Purchase Agreement",
        path: "/dashboard/print-docs",
        icon: FileText,
      },
    ],
  },
  {
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
    ],
  },
  {
    label: "Products Reports",
    icon: FileSpreadsheet,
    items: [
      {
        label: "Product Repayment",
        path: "/dashboard/product-repayments",
        icon: ClipboardCheck,
      },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

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
        {menuGroups.map((group, i) => (
          <SidebarMenuGroup
            key={`${group.label}-${i}`}
            group={group}
            collapsed={collapsed}
            activePath={location.pathname}
            onNavigate={handleNavigate}
          />
        ))}
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
