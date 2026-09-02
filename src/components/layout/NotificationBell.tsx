import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  BellRing,
  CheckCheck,
  Loader2,
  Info,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  CreditCard,
  Banknote,
  FileText,
  Users,
  Clock,
} from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
import { useNavigate } from "react-router-dom";
// ── Types ─────────────────────────────────────────────────────────────────────
interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  target_type: string;
  created_at: string;
  is_read: number;
  link?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

// ── Icon + color per notification type ───────────────────────────────────────
const typeConfig: Record<
  string,
  { icon: any; dot: string; bg: string; iconColor: string }
> = {
  info: {
    icon: Info,
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  warning: {
    icon: AlertTriangle,
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  success: {
    icon: CheckCircle2,
    dot: "bg-green-500",
    bg: "bg-green-50",
    iconColor: "text-green-600",
  },
  alert: {
    icon: Megaphone,
    dot: "bg-red-500",
    bg: "bg-red-50",
    iconColor: "text-red-600",
  },
  loan: {
    icon: CreditCard,
    dot: "bg-primary",
    bg: "bg-primary/10",
    iconColor: "text-primary",
  },
  payment: {
    icon: Banknote,
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  report: {
    icon: FileText,
    dot: "bg-muted-foreground",
    bg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  user: {
    icon: Users,
    dot: "bg-primary",
    bg: "bg-primary/10",
    iconColor: "text-primary",
  },
};
const getTypeConfig = (type: string) => typeConfig[type] || typeConfig["info"];

// ── NotificationBell ──────────────────────────────────────────────────────────
const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [open, setOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          userid: String(user.id),
          role: user.status || "",
          bname: user.bname || "",
        });
        const res = await fetch(`${API_BASE_URL}/api/notifications?${params}`);
        const data = await res.json();
        if (res.ok) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      } catch (_) {
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(() => fetchNotifications(true), 60000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
    );
    setUnreadCount((p) => Math.max(0, p - 1));
    try {
      await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: id, user_id: user?.id }),
      });
    } catch (_) {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          role: user?.status,
          bname: user?.bname,
        }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (_) {
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) fetchNotifications();
  };

  // Group by date label
  const grouped = notifications.reduce(
    (acc, n) => {
      const diffDays = Math.floor(
        (Date.now() - new Date(n.created_at).getTime()) / 86400000,
      );
      const label =
        diffDays === 0
          ? "Today"
          : diffDays === 1
            ? "Yesterday"
            : diffDays < 7
              ? `${diffDays} days ago`
              : new Date(n.created_at).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                });
      if (!acc[label]) acc[label] = [];
      acc[label].push(n);
      return acc;
    },
    {} as Record<string, Notification[]>,
  );

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          {unreadCount > 0 ? (
            <BellRing size={20} className="text-primary" />
          ) : (
            <Bell size={20} className="text-foreground/70" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {/* ── Popover: full-width on mobile, fixed width on sm+ ── */}
      <PopoverContent
        className="w-screen sm:w-[450px] p-0 shadow-xl border border-border rounded-xl overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({unreadCount} unread)
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No notifications
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              You're all caught up!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[min(70vh,400px)]">
            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                {/* Date divider */}
                <div className="px-4 py-1.5 bg-muted/50 border-b border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {label}
                  </p>
                </div>

                {items.map((n) => {
                  const cfg = getTypeConfig(n.type);
                  const Icon = cfg.icon;
                  const isUnread = !n.is_read;

                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (isUnread) markRead(n.id);
                        if (n.title?.toLowerCase().includes("leave request")) {
                          setOpen(false);
                          navigate("/dashboard/executive-leave");
                        }
                      }}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer transition-colors
                        ${isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"}`}
                    >
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}
                          >
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnread && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                              />
                            )}
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {notifications.length} total
            </p>
            <button
              onClick={() => fetchNotifications()}
              className="text-xs text-primary font-medium hover:underline"
            >
              Refresh
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
