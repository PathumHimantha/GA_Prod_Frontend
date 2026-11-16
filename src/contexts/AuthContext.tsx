// purchase app: src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { API } from "@/apiConfig";

export type UserRole =
  | "admin"
  | "executive"
  | "branch_manager"
  | "regional_manager"
  | "zone_head"
  | "manager";

export interface User {
  id: number;
  name: string;
  email: string;
  bname: string;
  bcode: string;
  status: UserRole;
  managedBranches?: { bname: string; bcode: string }[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  handoffLogin: (
    token: string,
  ) => Promise<{ success: boolean; error?: string }>; // ✅ NEW
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(API.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Invalid credentials" };
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Cannot connect to server. Please try again.",
      };
    }
  }, []);

  // ✅ NEW: Handoff login
  const handoffLogin = useCallback(async (token: string) => {
    try {
      const response = await fetch(API.auth.handoffLogin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Handoff login failed",
        };
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Cannot connect to server. Please try again.",
      };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.status as UserRole);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        handoffLogin,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
