import { API } from "@/apiConfig";

export interface Branch {
  bname: string;
  bcode: string;
}

/**
 * Fetch branches based on role, userId, and optional branch name
 */
export const fetchBranches = async ({
  role,
  userId,
  bname,
}: {
  role: string;
  userId?: string;
  bname?: string;
}): Promise<Branch[]> => {
  try {
    const params = new URLSearchParams();
    params.append("role", role);
    if (userId) params.append("userid", userId);
    if (bname) params.append("bname", bname);

    const res = await fetch(`${API.helper.branches}?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      console.error("fetchBranches error:", data.error);
      return [];
    }

    return data.branches as Branch[];
  } catch (err) {
    console.error("fetchBranches error:", err);
    return [];
  }
};
