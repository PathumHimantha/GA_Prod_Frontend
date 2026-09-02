import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ArrowUpDown } from "lucide-react";

interface PaymentRow {
  loanCode: string;
  customerCode: string;
  cname: string;
  amount: number;
  loanDate: string;
  weeklyPayment: number;
  thisWeekPayment: number;
  payment: number;
  balance: number;
  dueDate: string;
  arrears: number;
  status?: "ACTIVE" | "LAP";
}

interface PaymentsTableProps {
  type?: "single" | "multiple";
  data: PaymentRow[];
  onPaymentChange: (index: number, value: number) => void;
}

export const PaymentsTable = ({
  type,
  data,
  onPaymentChange,
}: PaymentsTableProps) => {
  const [sortColumn, setSortColumn] = useState<keyof PaymentRow | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: keyof PaymentRow) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;

    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });

  const formatCurrency = (value: number | undefined) => {
    const num = value ?? 0;
    return `Rs. ${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden w-full">
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="min-w-max">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("loanCode")}
                >
                  <div className="flex items-center gap-1">
                    Loan Code
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("customerCode")}
                >
                  <div className="flex items-center gap-1">
                    Customer Code
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("cname")}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                <TableHead
                  className="font-semibold text-right cursor-pointer"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("loanDate")}
                >
                  <div className="flex items-center gap-1">
                    Loan Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                <TableHead
                  className="font-semibold text-right cursor-pointer"
                  onClick={() => handleSort("weeklyPayment")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Weekly
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                {/* Payment column - only show when type is NOT "single" */}
                {type !== "single" && (
                  <TableHead className="font-semibold text-right">
                    Payment
                  </TableHead>
                )}

                <TableHead
                  className="font-semibold text-right cursor-pointer"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Balance
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>

                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("dueDate")}
                >
                  <div className="flex items-center gap-1">
                    Due Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead
                  className="font-semibold text-right cursor-pointer"
                  onClick={() => handleSort("arrears")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Arrears
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={`hover:bg-gray-50 ${
                    row.status === "LAP" ? "bg-red-50/50" : ""
                  }`}
                >
                  <TableCell className="font-mono text-xs">
                    {row.loanCode}
                  </TableCell>

                  <TableCell className="font-mono text-xs">
                    {row.customerCode}
                  </TableCell>

                  <TableCell className="font-medium">{row.cname}</TableCell>

                  <TableCell className="text-right text-sm">
                    {formatCurrency(row.amount)}
                  </TableCell>

                  <TableCell className="text-sm">{row.loanDate}</TableCell>

                  <TableCell className="text-right text-sm">
                    {formatCurrency(row.weeklyPayment)}
                  </TableCell>

                  {/* Payment input - only show when type is NOT "single" */}
                  {type !== "single" && (
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        placeholder="0"
                        className="w-24 h-8 text-right"
                        value={row.payment || ""}
                        onChange={(e) =>
                          onPaymentChange(
                            index,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </TableCell>
                  )}

                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.balance)}
                  </TableCell>

                  <TableCell className="text-sm">{row.dueDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "LAP" ? "destructive" : "default"}
                      className={
                        row.status === "LAP"
                          ? "bg-red-100 text-red-700 hover:bg-red-100"
                          : "bg-green-100 text-green-700 hover:bg-green-100"
                      }
                    >
                      {row.status === "LAP" ? "LAP" : "ACTIVE"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Badge
                      variant="destructive"
                      className="bg-red-100 text-red-700"
                    >
                      {formatCurrency(row.arrears)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};
