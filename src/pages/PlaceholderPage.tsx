import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = location.pathname
    .split("/")
    .pop()
    ?.replace(/-/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "Page";

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Construction size={32} className="text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{pageName}</h2>
      <p className="text-sm text-muted-foreground mt-2">This module is under development.</p>
    </div>
  );
};

export default PlaceholderPage;
