import { API } from "@/apiConfig";

export const submitFloat = async (data: {
  date: string;
  executive_name: string;
  bname: string;
  plot: number;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(API.floats.submit_float, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error };
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
};

export const getOverviewStats = async (params: {
  bname?: string;
  role?: string;
  name?: string;
  userid?: string | number;
}) => {
  const p = new URLSearchParams();
  if (params.bname) p.set("bname", params.bname);
  if (params.role) p.set("role", params.role);
  if (params.name) p.set("name", params.name);
  if (params.userid) p.set("userid", String(params.userid));

  const res = await fetch(`${API.floats.overview}?${p.toString()}`);
  return res.json();
};
