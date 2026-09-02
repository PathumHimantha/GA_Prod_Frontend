import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

interface DynamicTableProps<T extends Record<string, any>> {
  data: T[];
  columns: ColumnDef<T>[];
  filterKey?: keyof T | string;
  filterOptions?: FilterOption[];
  filterAllLabel?: string;
  searchKeys?: (keyof T | string)[];
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  onSearch?: (search: string) => void;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
}

function DynamicTable<T extends Record<string, any>>({
  data,
  columns,
  filterKey,
  filterOptions,
  filterAllLabel = "All",
  searchKeys = [],
  pageSize = 10,
  loading = false,
  emptyMessage = "No records found",
  onSearch,
  onPageChange,
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
}: DynamicTableProps<T>) {
  const [localSearch, setLocalSearch] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [localPage, setLocalPage] = useState(1);

  // Use controlled or uncontrolled mode
  const isControlled = !!onSearch && !!onPageChange;
  const search = isControlled ? localSearch : localSearch;
  const page = isControlled ? currentPage : localPage;
  const total = isControlled ? totalItems : data.length;
  const pages = isControlled ? totalPages : Math.ceil(data.length / pageSize);

  const filtered = useMemo(() => {
    let rows = [...data];

    if (filterKey && filterValue !== "all") {
      rows = rows.filter((r) => String(r[filterKey as string]) === filterValue);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        searchKeys.some((k) =>
          String(r[k as string] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }

    return rows;
  }, [data, filterKey, filterValue, search, searchKeys]);

  const paginated = isControlled
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleFilterChange = (v: string) => {
    setFilterValue(v);
    if (isControlled) {
      onPageChange(1);
    } else {
      setLocalPage(1);
    }
  };

  const handleSearch = (v: string) => {
    setLocalSearch(v);
    if (isControlled) {
      onSearch(v);
    } else {
      setLocalPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isControlled) {
      onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  };

  return (
    <div className="space-y-3 p-4">
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, ID, or category..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-200"
          />
        </div>
        {filterOptions && filterOptions.length > 0 && (
          <Select value={filterValue} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-white border-gray-200">
              <SelectValue placeholder={filterAllLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filterAllLabel}</SelectItem>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : paginated.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                {columns.map((col) => (
                  <TableHead
                    key={String(col.key)}
                    className={`font-semibold text-gray-600 ${col.className || ""}`}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((row, i) => (
                <TableRow key={i} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={`text-sm ${col.className || ""}`}
                    >
                      {col.render
                        ? col.render(row[col.key as string], row)
                        : String(row[col.key as string] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : paginated.length > 0 ? (
          paginated.map((row, i) => (
            <Card key={i} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 space-y-2">
                {columns.map((col) => (
                  <div
                    key={String(col.key)}
                    className="flex justify-between items-start gap-2"
                  >
                    <span className="text-xs text-gray-500 shrink-0 pt-0.5">
                      {col.header}
                    </span>
                    <span className="text-sm font-medium text-gray-800 text-right">
                      {col.render
                        ? col.render(row[col.key as string], row)
                        : String(row[col.key as string] ?? "—")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} records
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const pg =
                pages <= 5
                  ? i + 1
                  : page <= 3
                    ? i + 1
                    : page >= pages - 2
                      ? pages - 4 + i
                      : page - 2 + i;
              return (
                <Button
                  key={pg}
                  variant={page === pg ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => handlePageChange(pg)}
                >
                  {pg}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(Math.min(pages, page + 1))}
              disabled={page === pages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DynamicTable;
