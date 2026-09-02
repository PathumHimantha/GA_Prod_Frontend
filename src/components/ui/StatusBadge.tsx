import React from "react";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    active: "bg-amber-100 text-amber-800",
    inactive: "bg-gray-100 text-gray-700",
    "low-stock": "bg-yellow-100 text-yellow-800",
    "out-of-stock": "bg-red-100 text-red-800",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${cls}`}>
      {status.replace(/-/g, " ")}
    </span>
  );
};

export default StatusBadge;
