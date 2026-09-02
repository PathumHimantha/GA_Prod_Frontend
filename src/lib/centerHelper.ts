import { API, API_BASE_URL } from "@/apiConfig";

export interface Center {
  center: string;
  ccode: string;
}

// ── Get unique centers by branch name and optional day ─────────
export const getCenters = async (
  bname: string,
  // day?: string,
  type?: "B" | "C",
  userId?: string | number, // ← add
): Promise<Center[]> => {
  try {
    if (!bname) return [];

    let url = API.helper.centersbyday(bname);
    // if (day) url += `&day=${encodeURIComponent(day)}`;
    if (type) url += `&type=${type}`;
    if (userId) url += `&userid=${userId}`; // ← add

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to fetch centers:", data.error);
      return [];
    }

    return data.centers as Center[];
  } catch (err) {
    console.error("getCenters error:", err);
    return [];
  }
};

// src/lib/centerHelper.ts (relevant function only — add loan_type param)
export async function getDailyCenters(
  branch: string,
  day: string,
  userId?: string,
  loanType?: "daily" | "regular",
) {
  const params = new URLSearchParams({ branch, day });
  if (userId) params.set("userId", userId);
  if (loanType) params.set("loan_type", loanType);

  const res = await fetch(
    `${API_BASE_URL}/api/dailyloan/daily_centers?${params}`,
  );
  const data = await res.json();
  return data.centers || [];
}
