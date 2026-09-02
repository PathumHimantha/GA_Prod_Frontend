// ── Base URL ──────────────────────────────────────────────────
export const API_BASE_URL = "http://localhost:5000/api";
// export const API_BASE_URL = "http://57.128.195.112/api";
export const APP_API_BASE_URL = "https://application.goldenasia.lk/api";
//

// ── All Endpoints ─────────────────────────────────────────────
export const API = {
  // baseURL: "http://57.128.195.112/api",
  // baseURL: "https://application.goldenasia.lk/api",
  // baseURL: "http:///api",
  auth: {
    register: `${API_BASE_URL}/api/auth/register`,
    login: `${APP_API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    me: `${API_BASE_URL}/api/auth/me`,
    getUsers: `${API_BASE_URL}/api/auth/get_users`,
    updateUserStatus: (id: number | string) =>
      `${API_BASE_URL}/api/auth/update_user_status/${id}`,
    loginStats: (userId: number | string) =>
      `${API_BASE_URL}/api/auth/login-stats/${userId}`,
    forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
    verifyOtp: `${API_BASE_URL}/api/auth/verify-otp`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
  },
  helper: {
    branches: `${APP_API_BASE_URL}/api/helper/branches`,
    getUsers: `${API_BASE_URL}/api/helper/get_active_users`,
    centers: (bname: string) =>
      `${APP_API_BASE_URL}/api/helper/centers?bname=${encodeURIComponent(bname)}`,
    centersbyday: (bname: string) =>
      `${APP_API_BASE_URL}/api/helper/centers_by_day?bname=${encodeURIComponent(bname)}`,
    HelpingDetails: `${APP_API_BASE_URL}/api/helper/check_floats`,
    buildCashMessage: `${APP_API_BASE_URL}/api/helper/build_cash_message`,
  },

  loan: {
    submit: `${API_BASE_URL}/api/loan/submit`,
    validateNic: (nic: string, bcode: string) =>
      `${API_BASE_URL}/api/loan/validate_nic?nic=${encodeURIComponent(nic)}&bcode=${encodeURIComponent(bcode)}`,
    nextMemberNumber: `${API_BASE_URL}/api/loan/next-member-number`,
    getCustomerByLoan: (term: string, bcode: string) =>
      `${API_BASE_URL}/api/loan/get_customer_by_loan?term=${encodeURIComponent(term)}&bcode=${encodeURIComponent(bcode)}`,
    getCustomerByLoanrecipet: (term: string, bcode: string) =>
      `${API_BASE_URL}/api/loan/get_customer_by_loan_to_transfer?term=${encodeURIComponent(term)}&bcode=${encodeURIComponent(bcode)}`,
    renewConsumerLoan: `${API_BASE_URL}/api/loan/renew_consumer_loan`,
    verifyCustomer: `${API_BASE_URL}/api/loan/verify_customer`,
    addGuarantor: `${API_BASE_URL}/api/loan/add_guarantor`,
    uploadTransferReceipt: `${API_BASE_URL}/api/loan/upload_transfer_receipt`,
    successDetails: `${API_BASE_URL}/api/loan/loan-success-details`,
    getcusotmerto__deposit_cheques: `${API_BASE_URL}/api/loan/get_customer_to_deposit_cheque`,
  },
  dailyloan: {
    submitDaily: `${API_BASE_URL}/api/dailyloan/submit_daily`,
    renewDaily: `${API_BASE_URL}/api/dailyloan/renew_daily_loan`,
  },
  payments: {
    customers: `${API_BASE_URL}/api/payments/customers`,
    add: `${API_BASE_URL}/api/payments/add`,
    cashier_bulk: `${API_BASE_URL}/api/payments/cashier_payments`,
    excess_payments: `${API_BASE_URL}/api/payments/add_excess_payment`,
    get_excess_payments: `${API_BASE_URL}/api/payments/get_excess_payments`,
    get_cheque_deposits: `${API_BASE_URL}/api/payments/get_cheque_deposits`,
    submit_cheque_deposit: `${API_BASE_URL}/api/payments/submit_cheque_deposit`,
    deposit: `${API_BASE_URL}/api/payments/deposit`,
    customerspayments: `${API_BASE_URL}/api/payments/single_payment`,
  },

  cashier: {
    getExpenses: `${API_BASE_URL}/api/cashier/get_expenses`,
    addExpense: `${API_BASE_URL}/api/cashier/add_expense`,
    deleteExpense: (id: number | string) =>
      `${API_BASE_URL}/api/cashier/delete_expense/${id}`,
    getFloats: `${API_BASE_URL}/api/cashier/get_floats`,
    addFloat: `${API_BASE_URL}/api/cashier/add_float`,
    deleteFloat: `${API_BASE_URL}/api/cashier/delete_float`,
    getDeposits: `${API_BASE_URL}/api/cashier/get_deposits`,
    addDeposit: `${API_BASE_URL}/api/cashier/add_deposit`,
    deleteDeposit: `${API_BASE_URL}/api/cashier/delete_deposit`,
    getTransfers: `${API_BASE_URL}/api/cashier/get_transfers`,
    addTransfer: `${API_BASE_URL}/api/cashier/add_transfer`,
    deleteTransfer: `${API_BASE_URL}/api/cashier/delete_transfer`,
    getWeeklySummary: `${API_BASE_URL}/api/cashier/get_weekly_summary`,
    submitWeekSummary: `${API_BASE_URL}/api/cashier/submit_week_summary`,
    // getDaySummary: `${API_BASE_URL}/api/cashier/get_day_summary`,
    getDaySummary: `${API_BASE_URL}/api/cashreports/get_day_summary`,
    getWeekSummary: `${API_BASE_URL}/api/cashier/week-summary`,
    // getMonthlySummary: `${API_BASE_URL}/api/cashier/monthly-summary`,
    getFloatReport: `${API_BASE_URL}/api/cashier/get_float_report`,
    getDepositReport: `${API_BASE_URL}/api/cashier/get_deposit_report`,
    getTransferReport: `${API_BASE_URL}/api/cashier/get_transfer_report`,
    getMonthlySummary: `${API_BASE_URL}/api/cashreports/get_monthly_summary`,
    checkBranchDayend: `${API_BASE_URL}/api/cashreports/check_branch_dayend`,
  },
  customers: {
    ongoing: `${API_BASE_URL}/api/customers/ongoing`,
    settledByCustomer: (customer_code: string) =>
      `${API_BASE_URL}/api/customers/settled-by-customer/${encodeURIComponent(customer_code)}`,
    details: (loan_code: string) =>
      `${API_BASE_URL}/api/customers/details/${loan_code}`,
    update: (loanCode: string) =>
      `${API_BASE_URL}/api/customers/update?loan_code=${encodeURIComponent(loanCode)}`,
    // inside customers object:
    search: (query: string) =>
      `${API_BASE_URL}/api/customers/search?query=${encodeURIComponent(query)}`,
    center_payments: `${API_BASE_URL}/api/customers/center_payments`,
    delete: (paymentId: number) =>
      `${API_BASE_URL}/api/customers/delete_payments/${paymentId}`,
    deleteLoan: (loan_code: string) =>
      `${API_BASE_URL}/api/customers/delete_loan/${loan_code}`,
    recoveryStatus: (loanCode: string) =>
      `${API_BASE_URL}/api/customers/recovery-status/${encodeURIComponent(loanCode)}`,
  },

  report: {
    getDayEnd: `${API_BASE_URL}/api/report/get_day_end_details`,
    submitDayEnd: `${API_BASE_URL}/api/report/submit_day_end`,
    getGrantReport: `${API_BASE_URL}/api/report/get_grant_report`,
    exportGrantReport: `${API_BASE_URL}/api/report/export_grant_report`,
    getBranchesForReport: `${API_BASE_URL}/api/report/get_branches_for_report`,
    get_notpaid_report: `${API_BASE_URL}/api/report/get_notpaid_report`,
    getBranchReport: `${API_BASE_URL}/api/report/get_branch_report`,
    getBranchDayEndSummary: `${API_BASE_URL}/api/report/get_branch_day_end_summary`,
    getAllBranchExecutiveReport: `${API_BASE_URL}/api/report/get_all_branch_executive_report`,
    submitBranchDayEnd: `${API_BASE_URL}/api/report/submit_branch_dayend`,
    getCollectionReport: `${API_BASE_URL}/api/report/get_collection_report`,
    getAccountStock: `${API_BASE_URL}/api/report/get_account_stock`,
    getExpenseReport: `${API_BASE_URL}/api/report/get_expense_report`,
    dayEndHelpingDetails: `${API_BASE_URL}/api/report/day_end_helping_details`,
    grantStats: `${API_BASE_URL}/api/report/grant_stats`,
  },

  products: {
    getAll: `${API_BASE_URL}/api/products`,
    getById: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    create: `${API_BASE_URL}/products`,
    update: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    delete: (id: string) => `${API_BASE_URL}/api/products/${id}`,
    uploadImages: `${API_BASE_URL}/api/products/upload-images`,
  },
};
