// components/common/FloatWarningBanner.tsx
import { AlertTriangle } from "lucide-react";

interface FloatWarningBannerProps {
  checkingFloat: boolean;
  canSubmitLoan: boolean;
  floatReason: string;
  title?: string;
  description?: string;
}

export const FloatWarningBanner = ({
  checkingFloat,
  canSubmitLoan,
  floatReason,
  title = "Payments Disabled",
  description = "Float record not found for today. Please contact your branch manager.",
}: FloatWarningBannerProps) => {
  if (checkingFloat || canSubmitLoan) return null;

  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800">{title}</p>
        <p className="text-xs text-red-600 mt-0.5">
          {floatReason || description}
        </p>
      </div>
    </div>
  );
};
