import { render, screen, fireEvent } from "@testing-library/react";
import LoansPage from "../pages/loans/LoansPage";
import NewLoan from "../pages/loans/NewLoan";
import { MemoryRouter, Route, Routes } from "react-router-dom";

describe("Loan pages", () => {
  it("renders consumer loans title and tabs", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/loans/consumer"]}>
        <Routes>
          <Route path="/dashboard/loans/:category" element={<LoansPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Consumer Loans/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /New Loan/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Renew Loan/i }),
    ).toBeInTheDocument();
    // default inner title should show new loan
    expect(screen.getByText(/- New Loan/i)).toBeInTheDocument();
  });

  it("renders business docs when NewLoan isBusiness", () => {
    render(<NewLoan isBusiness />);
    expect(screen.getByText(/Business Loan Documents/i)).toBeInTheDocument();
  });

  it("hides business docs for consumer", () => {
    render(<NewLoan />);
    expect(
      screen.queryByText(/Business Loan Documents/i),
    ).not.toBeInTheDocument();
  });

  it("switches to guarantor tab and shows fields", () => {
    render(<NewLoan />);
    const guarantorTab = screen.getByRole("tab", {
      name: /Guarantor Details/i,
    });
    fireEvent.click(guarantorTab);
    expect(screen.getByLabelText(/Guarantor Name/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Guarantor Phone Number/i),
    ).toBeInTheDocument();
  });
});
