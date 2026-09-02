import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
export interface SubMenuItem {
  label: string;
  path: string;
  roles?: UserRole[];
  excludeRoles?: UserRole[];
}

export interface MenuGroup {
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  items: SubMenuItem[];
}

interface SidebarMenuGroupProps {
  group: MenuGroup;
  collapsed: boolean;
  activePath: string;
  onNavigate: (path: string) => void;
}

export const SidebarMenuGroup = ({
  group,
  collapsed,
  activePath,
  onNavigate,
}: SidebarMenuGroupProps) => {
  const [open, setOpen] = useState(false);
  const { hasRole } = useAuth();
  const Icon = group.icon;

  // Filter items based on role
  const visibleItems = group.items.filter((item) => {
    if (item.roles && !hasRole(...item.roles)) return false;
    if (item.excludeRoles && item.excludeRoles.some((r) => hasRole(r)))
      return false;
    return true;
  });

  if (visibleItems.length === 0) return null;
  if (group.roles && !hasRole(...group.roles)) return null;

  const isActive = visibleItems.some((i) => activePath === i.path);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-sidebar-accent group
          ${isActive ? "sidebar-item-active text-sidebar-primary" : "text-sidebar-foreground"}
        `}
      >
        <Icon
          size={18}
          className={
            isActive
              ? "text-sidebar-primary"
              : "text-sidebar-muted group-hover:text-sidebar-foreground"
          }
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left font-medium">{group.label}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""} text-sidebar-muted`}
            />
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3 animate-accordion-down">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path} // ← add this
              onClick={() => onNavigate(item.path)}
              className={`block text-sm px-3 py-2 rounded-md transition-colors duration-150
    ${
      activePath === item.path
        ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
        : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
    }
  `}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
