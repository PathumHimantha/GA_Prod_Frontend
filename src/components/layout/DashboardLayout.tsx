import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import TopNavbar from "./TopNavbar";
import loginBg from "@/assets/login-bg.jpg";

const DashboardLayout = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="h-screen sticky top-0">
          <AppSidebar collapsed={!sidebarOpen} />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-secondary/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full animate-slide-in-left">
            <AppSidebar
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setMobileOpen(!mobileOpen);
            } else {
              setSidebarOpen(!sidebarOpen);
            }
          }}
        />

        <main
          className="flex-1 p-4 md:p-6 watermark-bg relative"
          style={
            { "--watermark-image": `url(${loginBg})` } as React.CSSProperties
          }
        >
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
