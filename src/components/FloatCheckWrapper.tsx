// components/common/FloatCheckWrapper.tsx
import { useState, useEffect } from "react";
import { ReactNode } from "react";
import { useFloatCheck } from "@/lib/useFloatCheck";
import { FloatWarningBanner } from "./FloatWarningBanner";

interface FloatCheckWrapperProps {
  bname: string;
  name: string;
  userId: string;
  date: string;
  children: ReactNode;
  enabled?: boolean;
  warningTitle?: string;
  warningDescription?: string;
  onFloatCheckComplete?: (canSubmit: boolean) => void;
}

export const FloatCheckWrapper = ({
  bname,
  name,
  userId,
  date,
  children,
  enabled = true,
  warningTitle = "Payments Disabled",
  warningDescription = "Float record not found for today. Please contact your branch manager.",
  onFloatCheckComplete,
}: FloatCheckWrapperProps) => {
  const { canSubmitLoan, floatReason, checkingFloat } = useFloatCheck(
    bname,
    name,
    userId,
    date,
    enabled,
  );

  // Notify parent when check is complete
  useEffect(() => {
    if (!checkingFloat && onFloatCheckComplete) {
      onFloatCheckComplete(canSubmitLoan);
    }
  }, [checkingFloat, canSubmitLoan, onFloatCheckComplete]);

  return (
    <div className="space-y-4">
      <FloatWarningBanner
        checkingFloat={checkingFloat}
        canSubmitLoan={canSubmitLoan}
        floatReason={floatReason}
        title={warningTitle}
        description={warningDescription}
      />
      {children}
    </div>
  );
};
