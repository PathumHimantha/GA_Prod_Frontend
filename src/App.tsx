import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import NewLoan from "./pages/loans/NewLoan";
import RenewLoan from "./pages/loans/RenewLoan";

import ManageProducts from "./pages/products/ManageProducts";
import ManageStocks from "./pages/products/ManageStocks";
import ForgotPassword from "./pages/ForgotPassword";
import ProductDashboard from "./pages/ProductDashbaord/ProductDashboard";
import NotFound from "./pages/NotFound";
import SingleProduct from "./pages/ProductDashbaord/SingleProduct";
import ProductCart from "./pages/ProductDashbaord/ProductCart";
import ManageOrders from "./pages/products/ManageOrders";
import ProductPayments from "./pages/Payments/ProductPayments";
import SinglePayments from "./pages/Payments/SinglePayment";
import Repayment from "./pages/Reports/Repayment";
import PrintLoanAgreementDoc from "./pages/DocPrint/PrintLoanAgreementDoc";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products/manage" element={<ManageProducts />} />
              <Route path="products/stocks" element={<ManageStocks />} />
              <Route path="products" element={<ProductDashboard />} />
              <Route path="product/:id" element={<SingleProduct />} />
              <Route path="product-cart" element={<ProductCart />} />
              <Route path="orders" element={<ManageOrders />} />
              <Route path="product-payments" element={<ProductPayments />} />
              <Route path="single-payments" element={<SinglePayments />} />
              <Route path="product-repayments" element={<Repayment />} />
              <Route path="print-docs" element={<PrintLoanAgreementDoc />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
