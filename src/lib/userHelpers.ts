import { API } from "@/apiConfig";

export interface User {
  role: string;
  id: number;
  name: string;
  email: string;
  bname: string;
  bcode: string;
  code: string;
  status: string;
  user_status: string;
}

// ── Get all ACTIVE users ──────────────────────────────────────
export const getActiveUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(API.auth.getUsers);
    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to fetch users:", data.error);
      return [];
    }

    // Filter only active users for dropdowns
    return (data.users as User[]).filter((u) => u.user_status === "active");
  } catch (err) {
    console.error("getActiveUsers error:", err);
    return [];
  }
};
