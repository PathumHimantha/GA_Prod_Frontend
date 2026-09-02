import { API } from "@/apiConfig";

export interface CustomerPayment {
  cname: string;
  loan_code: string;
  customer_code: string;
  name: string;
  loan_amount: number;
  loan_date: string;
  week_payment: number;
  due_date: string;
  loan_balance: number;
  arrears: number;
}

export const getCustomersByCenter = async (
  bname: string,
  center: string,
  ccode?: string,
): Promise<CustomerPayment[]> => {
  try {
    const query = new URLSearchParams({
      bname,
      center,
    });

    if (ccode) query.append("ccode", ccode);

    const res = await fetch(`${API.payments.customers}?${query}`);

    const data = await res.json();

    if (!res.ok) return [];

    return data.customers as CustomerPayment[];
  } catch (err) {
    console.error("getCustomersByCenter error:", err);
    return [];
  }
};

export const searchCustomer = async (
  search: string,
): Promise<CustomerPayment[]> => {
  try {
    const res = await fetch(`${API.payments.customers}?search=${search}`);

    const data = await res.json();

    if (!res.ok) return [];

    return data.customers as CustomerPayment[];
  } catch (err) {
    console.error("searchCustomer error:", err);
    return [];
  }
};

export const searchCustomerforpayments = async (
  search: string,
): Promise<CustomerPayment[]> => {
  try {
    const res = await fetch(
      `${API.payments.customerspayments}?search=${search}`,
    );

    const data = await res.json();

    if (!res.ok) return [];

    return data.customers as CustomerPayment[];
  } catch (err) {
    console.error("searchCustomer error:", err);
    return [];
  }
};

export interface SubmitPaymentPayload {
  loanCode?: string;
  customerCode?: string;
  name?: string;
  payment: number;
  method: string;
  cdkNumber?: string;
}
export const submitPayment = async (
  payload: SubmitPaymentPayload,
): Promise<boolean> => {
  try {
    const res = await fetch(API.payments.add, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("submitPayment error:", data.error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("submitPayment error:", err);
    return false;
  }
};

export const submitBulkPayments = async (payments: any[]) => {
  try {
    const res = await fetch(`${API.payments.cashier_bulk}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payments }),
    });

    const data = await res.json();

    if (!res.ok) return false;
    return true;
  } catch (err) {
    console.error("submitBulkPayments error:", err);
    return false;
  }
};

export const addExcessPayment = async (data: {
  branch_name: string;
  executive_name: string;
  payment_date: string;
  amount: number;
  description: string;
  created_by: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`${API.payments.excess_payments}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) return { success: false, error: json.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: "Network error" };
  }
};

export const getExcessPayments = async (filters?: {
  role?: string;
  userid?: string;
  bname?: string;
  branch_name?: string;
}): Promise<{
  records: any[];
  metrics: {
    total_count: number;
    total_amount: number;
    today_count: number;
    today_amount: number;
  };
}> => {
  const params = new URLSearchParams();
  if (filters?.role) params.append("role", filters.role);
  if (filters?.userid) params.append("userid", filters.userid);
  if (filters?.bname) params.append("bname", filters.bname);
  if (filters?.branch_name) params.append("branch_name", filters.branch_name);

  const res = await fetch(
    `${API.payments.get_excess_payments}?${params.toString()}`,
  );
  const json = await res.json();
  return json;
};

export const getCustomerByLoan = async (term: string, bcode: string) => {
  const url = API.loan.getCustomerByLoan(term, bcode);

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || "Customer not found");

  return json;
};

export const get__deposit_cheques = async (term: string, bcode: string) => {
  const params = new URLSearchParams({ term, bcode });
  const url = `${API.loan.getcusotmerto__deposit_cheques}?${params.toString()}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || "Customer not found");

  return json;
};

export const getCustomerByLoanToTransfer = async (
  term: string,
  bcode: string,
) => {
  const url = API.loan.getCustomerByLoanrecipet(term, bcode);

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || "Customer not found");

  return json;
};

export const submitChequeDeposit = async (data: {
  customer_code: string;
  loan_code: string;
  nic: string;
  customer_name: string;
  branch_name: string;
  branch_code: string;
  center: string;
  cheque_number: string;
  cheque_date: string;
  cheque_amount: number;
  submitted_by: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(API.payments.submit_cheque_deposit, {
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

export const getChequeDeposits = async ({
  branch_code,
  submitted_by,
  role,
  userid,
  bname,
}: {
  branch_code?: string;
  submitted_by?: string;
  role?: string;
  userid?: string;
  bname?: string;
}) => {
  const params = new URLSearchParams();
  if (branch_code) params.set("branch_code", branch_code);
  if (submitted_by) params.set("submitted_by", submitted_by);
  if (role) params.set("role", role);
  if (userid) params.set("userid", userid);
  if (bname) params.set("bname", bname);

  const res = await fetch(`${API.payments.get_cheque_deposits}?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch cheque deposits");
  return json;
};
