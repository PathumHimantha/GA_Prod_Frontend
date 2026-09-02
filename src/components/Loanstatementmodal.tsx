import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, X } from "lucide-react";
import { API_BASE_URL } from "@/apiConfig";
// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
  customer_code: string;
  cname: string;
  nic: string;
  address: string;
  phone1: string;
  phone2?: string;
  center: string;
  ccode: string;
  group: string;
  bname: string;
  bcode?: string;
  name: string;
  loan_code: string;
  loan_amount: number;
  full_loan: number;
  loan_balance: number;
  week_payment: number;
  payment: number;
  loan_date: string;
  due_date: string;
  type: string;
  loan_category?: string;
}

interface Payment {
  payment: number;
  payment_date: string;
  week_number: number;
  added_by: string;
}

interface LoanWithPayments {
  loan_code: string;
  loan_amount: string;
  loan_balance: string;
  loan_date: string;
  due_date: string;
  full_loan: string;
  week_payment: string;
  type: string;
  loan_category: string | null;
  period: string;
  interest: string;
  payments: Payment[];
  charges?: any[];
  total_charges?: number;
  actual_balance?: number;
}

interface LoanStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithPayments | null;
  customer: Customer;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `Rs. ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtDateShort = (d?: string | null) => {
  if (!d) return "—";
  return String(d).slice(0, 10);
};

const getDayName = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
};

const now = () => {
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 8);
  return { date, time, full: `${date} ${time}` };
};

// ── Component ─────────────────────────────────────────────────────────────────
const LoanStatementModal = ({
  isOpen,
  onClose,
  loan,
  customer,
}: LoanStatementModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!loan) return null;

  const generated = now();
  const totalPaid = loan.payments.reduce((s, p) => s + Number(p.payment), 0);
  const isSettled = Number(loan.loan_balance) === 0;
  const interestRate =
    parseFloat(loan.interest) > 1
      ? parseFloat(loan.interest)
      : parseFloat(loan.interest) * 100;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
  <html>
    <head>
      <title>Loan Statement - ${loan.loan_code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9px; color: #1a1a2e; }
        .page { padding: 10px 14px; max-width: 900px; margin: 0 auto; }
        @page { size: A4; margin: 8mm; }
        .header { text-align: center; border-bottom: 2px solid #c8a84b; padding-bottom: 6px; margin-bottom: 8px; }
        .header h1 { font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #1a1a2e; }
        .header p { font-size: 8px; color: #555; margin-top: 1px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .section { border: 1px solid #e0c97a; border-radius: 4px; overflow: hidden; }
        .section-header { background: #f9f0d4; padding: 4px 8px; font-weight: 700; font-size: 8px; color: #7a5c00; border-bottom: 1px solid #e0c97a; text-transform: uppercase; letter-spacing: 0.5px; }
        .section-body { padding: 4px 8px; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f5f5f5; font-size: 8px; }
        .row:last-child { border-bottom: none; }
        .row .lbl { color: #555; }
        .row .val { font-weight: 600; text-align: right; }
        .summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-bottom: 8px; }
        .summary-card { border: 1px solid #e0c97a; border-radius: 4px; padding: 5px 4px; text-align: center; background: #fffdf0; }
        .summary-card .s-label { font-size: 7px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
        .summary-card .s-value { font-size: 10px; font-weight: 800; color: #1a1a2e; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 8px; }
        .info-card { border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 6px; background: #fafafa; }
        .info-card .i-label { font-size: 7px; color: #888; text-transform: uppercase; margin-bottom: 2px; }
        .info-card .i-value { font-size: 9px; font-weight: 700; color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; font-size: 8px; }
        thead { background: #1a1a2e; }
        thead th { color: #f9f0d4; padding: 4px 6px; text-align: left; font-weight: 600; }
        tbody tr:nth-child(even) { background: #fffdf0; }
        tbody tr:nth-child(odd) { background: #ffffff; }
        tbody td { padding: 3px 6px; border-bottom: 1px solid #f0ead0; }
        .paid { color: #166534; font-weight: 700; }
        .status-badge { border-radius: 2px; padding: 1px 4px; font-size: 7px; font-weight: 700; }
        .footer { margin-top: 8px; border-top: 1px solid #c8a84b; padding-top: 5px; font-size: 7px; color: #888; text-align: center; }
        .balance-row { background: #1a1a2e !important; }
        .balance-row td { color: #f9f0d4 !important; font-weight: 700; padding: 5px 6px; }
        .tbl-section { border: 1px solid #e0c97a; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
        .tbl-header { background: #f9f0d4; padding: 4px 8px; font-weight: 700; font-size: 8px; color: #7a5c00; border-bottom: 1px solid #e0c97a; text-transform: uppercase; }
      </style>
    </head>
    <body>
      ${content.innerHTML}
    </body>
  </html>
`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  useEffect(() => {
    if (!isOpen || !loan?.loan_code) return;
    setScheduleLoading(true);
    fetch(
      `${API_BASE_URL}/api/loan/statement?loan_code=${encodeURIComponent(loan.loan_code)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        // Sort the schedule by week number
        const sortedSchedule = (data.schedule || []).sort(
          (a: any, b: any) => Number(a.week_no) - Number(b.week_no),
        );
        setSchedule(sortedSchedule);
      })
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false));
  }, [isOpen, loan?.loan_code]);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 gap-0">
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a2e] border-b border-[#c8a84b]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#c8a84b]/20 flex items-center justify-center">
              <span className="text-[#c8a84b] text-sm font-bold">GA</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Loan Statement</p>
              <p className="text-[10px] text-[#c8a84b] font-mono">
                {loan.loan_code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs border-[#c8a84b]/40 text-[#c8a84b] hover:bg-[#c8a84b]/10 bg-transparent"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="overflow-y-auto max-h-[calc(92vh-56px)] bg-gray-50">
          <div ref={printRef} className="page bg-white">
            <div
              style={{ padding: "24px", maxWidth: "860px", margin: "0 auto" }}
            >
              {/* ── Header ── */}
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "3px solid #c8a84b",
                  paddingBottom: "16px",
                  marginBottom: "20px",
                }}
              >
                <h1
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    letterSpacing: "2px",
                    color: "#1a1a2e",
                  }}
                >
                  LOAN STATEMENT
                </h1>
                <p
                  style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}
                >
                  Golden Asia Investment
                </p>
                <p
                  style={{ fontSize: "11px", color: "#333", marginTop: "5px" }}
                >
                  Date: {generated.date} | Time: {generated.time}
                </p>
                <p
                  style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}
                >
                  Generated: {generated.full}
                </p>
              </div>

              {/* ── Two-column info grid ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                {/* Branch & Center */}
                <div
                  style={{
                    border: "1px solid #e0c97a",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#f9f0d4",
                      padding: "8px 12px",
                      fontWeight: 700,
                      fontSize: "11px",
                      color: "#7a5c00",
                      borderBottom: "1px solid #e0c97a",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Branch &amp; Center Details
                  </div>
                  <div style={{ padding: "8px 12px" }}>
                    {[
                      ["Branch Name", customer.bname],
                      [
                        "Branch Code",
                        customer.bcode || customer.bname?.slice(0, 3),
                      ],
                      ["Center Name", customer.center],
                      ["Center Code", customer.ccode],
                      ["Loan Date", fmtDateShort(loan.loan_date)],
                    ].map(([lbl, val]) => (
                      <div
                        key={lbl}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid #f5f5f5",
                          fontSize: "11px",
                        }}
                      >
                        <span style={{ color: "#555" }}>{lbl}:</span>
                        <span style={{ fontWeight: 600 }}>{val || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Details */}
                <div
                  style={{
                    border: "1px solid #e0c97a",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#f9f0d4",
                      padding: "8px 12px",
                      fontWeight: 700,
                      fontSize: "11px",
                      color: "#7a5c00",
                      borderBottom: "1px solid #e0c97a",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Customer Details
                  </div>
                  <div style={{ padding: "8px 12px" }}>
                    {[
                      ["Customer Name", customer.cname],
                      ["NIC Number", customer.nic],
                      ["Address", customer.address],
                      ["Phone Number", customer.phone1],
                      ["Customer Code", customer.customer_code],
                      ["Executive Name", customer.name],
                      ["Center Day", getDayName(loan.loan_date)],
                      ["Due Date", fmtDateShort(loan.due_date)],
                    ].map(([lbl, val]) => (
                      <div
                        key={lbl}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "3.5px 0",
                          borderBottom: "1px solid #f5f5f5",
                          fontSize: "11px",
                        }}
                      >
                        <span style={{ color: "#555" }}>{lbl}:</span>
                        <span
                          style={{
                            fontWeight: 600,
                            textAlign: "right",
                            maxWidth: "55%",
                            wordBreak: "break-word",
                          }}
                        >
                          {val || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Loan Summary Cards ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                {[
                  {
                    label: "Loan Amount",
                    value: fmt(loan.loan_amount),
                    color: "#1a1a2e",
                  },
                  {
                    label: "Full Loan",
                    value: fmt(loan.full_loan),
                    color: "#7a5c00",
                  },
                  {
                    label: "Total Paid",
                    value: fmt(totalPaid),
                    color: "#166534",
                  },
                  {
                    label: "Charges",
                    value: fmt(loan.total_charges ?? 0),
                    color: "#b45309",
                  },
                  {
                    label: "Loan Balance",
                    value: fmt(loan.actual_balance ?? loan.loan_balance),
                    color: "#b91c1c",
                  },
                  {
                    label: "Full Balance",
                    value: fmt(loan.loan_balance),
                    color: isSettled ? "#166534" : "#b91c1c",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      border: "1px solid #e0c97a",
                      borderRadius: "6px",
                      padding: "10px",
                      textAlign: "center",
                      background: "#fffdf0",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#888",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "4px",
                      }}
                    >
                      {label}
                    </p>
                    <p style={{ fontSize: "13px", fontWeight: 800, color }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Loan Info row ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                {[
                  { label: "Period", value: `${loan.period} Weeks` },
                  {
                    label: "Interest Rate",
                    value: `${interestRate.toFixed(0)}%`,
                  },
                  { label: "Weekly Payment", value: fmt(loan.week_payment) },
                  { label: "Status", value: isSettled ? "SETTLED" : "ACTIVE" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      background: "#fafafa",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#888",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "3px",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1a1a2e",
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Payment History Table ── */}
              <div
                style={{
                  border: "1px solid #e0c97a",
                  borderRadius: "6px",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    background: "#f9f0d4",
                    padding: "8px 12px",
                    fontWeight: 700,
                    fontSize: "11px",
                    color: "#7a5c00",
                    borderBottom: "1px solid #e0c97a",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.5px",
                  }}
                >
                  Payment History — {schedule.length} Transactions
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "10px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#1a1a2e" }}>
                      {[
                        "Week #",
                        "Due Date",
                        "Paid Amount",
                        "Due Amount",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: "#f9f0d4",
                            padding: "7px 10px",
                            textAlign: "left",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleLoading ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: "16px",
                            textAlign: "center",
                            color: "#888",
                          }}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : schedule.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: "16px",
                            textAlign: "center",
                            color: "#888",
                          }}
                        >
                          No payments recorded
                        </td>
                      </tr>
                    ) : (
                      schedule.map((row, i) => (
                        <tr
                          key={i}
                          style={{
                            background:
                              row.status === "PENDING"
                                ? "#fff1f2"
                                : row.status === "HOLIDAY"
                                  ? "#fffbeb"
                                  : i % 2 === 0
                                    ? "#ffffff"
                                    : "#fffdf0",
                          }}
                        >
                          <td
                            style={{
                              padding: "6px 10px",
                              borderBottom: "1px solid #f0ead0",
                              fontWeight: 600,
                            }}
                          >
                            Week {row.week_no}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              borderBottom: "1px solid #f0ead0",
                            }}
                          >
                            {fmtDate(row.due_date)}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              borderBottom: "1px solid #f0ead0",
                              color:
                                Number(row.payment) === 0
                                  ? "#b91c1c"
                                  : Number(row.payment) <
                                      Number(row.week_payment)
                                    ? "#b45309"
                                    : "#166534",
                              fontWeight: 700,
                            }}
                          >
                            {fmt(row.payment)}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              borderBottom: "1px solid #f0ead0",
                              color: "#555",
                            }}
                          >
                            {fmt(row.week_payment)}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              borderBottom: "1px solid #f0ead0",
                            }}
                          >
                            <span
                              style={{
                                background:
                                  row.status === "PAID" ? "#dcfce7" : "#fef9c3",
                                color:
                                  row.status === "PAID" ? "#166534" : "#854d0e",
                                borderRadius: "3px",
                                padding: "1px 6px",
                                fontSize: "9px",
                                fontWeight: 700,
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                    {/* Totals row */}
                    <tr style={{ background: "#1a1a2e" }}>
                      <td
                        colSpan={2}
                        style={{
                          padding: "8px 10px",
                          color: "#f9f0d4",
                          fontWeight: 700,
                        }}
                      >
                        TOTAL PAID (
                        {schedule.filter((r) => r.status === "PAID").length}{" "}
                        payments)
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          color: "#c8a84b",
                          fontWeight: 800,
                          fontSize: "12px",
                        }}
                      >
                        {fmt(
                          schedule.reduce(
                            (s, r) => s + Number(r.payment || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          padding: "8px 10px",
                          color: "#f9f0d4",
                          fontWeight: 600,
                        }}
                      >
                        Balance:{" "}
                        <span
                          style={{ color: isSettled ? "#86efac" : "#fca5a5" }}
                        >
                          {fmt(loan.loan_balance)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Footer ── */}
              <div
                style={{
                  borderTop: "2px solid #c8a84b",
                  paddingTop: "12px",
                  fontSize: "9px",
                  color: "#888",
                  textAlign: "center",
                }}
              >
                <p>
                  This is a computer-generated statement from Golden Asia
                  Investment. | Generated: {generated.full}
                </p>
                <p style={{ marginTop: "3px" }}>
                  Loan Code: {loan.loan_code} | Customer: {customer.cname} |{" "}
                  {customer.customer_code}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanStatementModal;
