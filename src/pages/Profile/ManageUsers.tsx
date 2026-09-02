import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Users,
  Building2,
  UserCircle,
  ArrowRight,
  Phone,
} from "lucide-react";

import { API_BASE_URL } from "@/apiConfig";

interface Executive {
  id: number;
  name: string;
  email: string;
  bname: string;
  role: string;
  full_name?: string;
  nic?: string;
  contact_personal?: string;
  profile_image?: string;
}

interface Props {
  onViewUser: (userId: number) => void;
}

const PAGE_SIZE = 10;

const roleColor = (role: string) => {
  const map: Record<string, string> = {
    executive: "bg-blue-50 text-blue-700 border-blue-200",
    manager: "bg-purple-50 text-purple-700 border-purple-200",
    branch_manager: "bg-teal-50 text-teal-700 border-teal-200",
    regional_manager: "bg-orange-50 text-orange-700 border-orange-200",
    zone_head: "bg-red-50 text-red-700 border-red-200",
  };
  return map[role] || "bg-slate-50 text-slate-600 border-slate-200";
};

const ManageUsers = ({ onViewUser }: Props) => {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const fetchExecutives = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search: search,
      });
      const res = await fetch(
        `${API_BASE_URL}/api/profile/executives?${params}`,
      );
      const data = await res.json();
      setExecutives(data.executives || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchExecutives();
  }, [fetchExecutives]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const offset = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            value: total,
            icon: Users,
            color: "text-primary",
          },
          {
            label: "Showing",
            value: `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)}`,
            icon: UserCircle,
            color: "text-slate-600",
          },
          {
            label: "Page",
            value: `${page} / ${totalPages}`,
            icon: ChevronRight,
            color: "text-slate-600",
          },
          {
            label: "Filtered by",
            value: search || "All",
            icon: Search,
            color: "text-slate-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-sm font-bold text-slate-700">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by name, email, NIC, branch..."
                className="pl-9 h-11 rounded-xl border-slate-200"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="h-11 px-5 rounded-xl gap-2"
            >
              <Search className="w-4 h-4" /> Search
            </Button>
            {search && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  setPage(1);
                }}
                className="h-11 px-4 rounded-xl"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> All Executives & Managers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : executives.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No executives found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {[
                    "#",
                    "Executive",
                    "Branch",
                    "Role",
                    "NIC",
                    "Contact",
                    "",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-xs font-semibold text-slate-500 whitespace-nowrap"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {executives.map((exec, idx) => (
                  <TableRow
                    key={exec.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => onViewUser(exec.id)}
                  >
                    <TableCell className="text-xs text-slate-400 w-10">
                      {offset + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {exec.profile_image ? (
                          <img
                            src={`${API_BASE_URL}/${exec.profile_image}`}
                            alt={exec.name}
                            className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                            {exec.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {exec.name}
                          </p>
                          <p className="text-xs text-slate-400">{exec.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {exec.bname}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`border text-[11px] capitalize ${roleColor(exec.role)}`}
                      >
                        {exec.role?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {exec.nic || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell>
                      {exec.contact_personal ? (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {exec.contact_personal}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewUser(exec.id);
                        }}
                        className="h-8 px-3 rounded-xl hover:bg-primary/10 hover:text-primary gap-1 text-xs font-medium"
                      >
                        Edit <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
              {total} executives
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return p <= totalPages ? (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold ${p === page ? "bg-primary" : ""}`}
                  >
                    {p}
                  </Button>
                ) : null;
              })}

              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ManageUsers;
