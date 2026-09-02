// lib/useFloatCheck.ts
import { useState, useEffect } from "react";
import { APP_API_BASE_URL } from "@/apiConfig";

interface FloatCheckResult {
  canSubmitLoan: boolean;
  floatReason: string;
  checkingFloat: boolean;
  refetch: () => void;
}

export function useFloatCheck(
  bname: string,
  name: string,
  userId: string,
  date: string,
  enabled: boolean = true,
): FloatCheckResult {
  const [canSubmitLoan, setCanSubmitLoan] = useState(false);
  const [floatReason, setFloatReason] = useState("");
  const [checkingFloat, setCheckingFloat] = useState(true);

  const checkFloat = async () => {
    if (!bname || !name || !userId || !date || !enabled) {
      setCheckingFloat(false);
      return;
    }

    setCheckingFloat(true);
    try {
      const params = new URLSearchParams({
        bname: bname,
        name: name,
        userid: userId,
        date: date,
      });
      const res = await fetch(
        `${APP_API_BASE_URL}/api/helper/check_float_submission?${params}`,
      );
      const data = await res.json();
      setCanSubmitLoan(data.can_add === true);
      setFloatReason(data.reason || "");
    } catch {
      setCanSubmitLoan(false);
      setFloatReason("Cannot connect to server");
    } finally {
      setCheckingFloat(false);
    }
  };

  useEffect(() => {
    checkFloat();
  }, [bname, name, userId, date, enabled]);

  return {
    canSubmitLoan,
    floatReason,
    checkingFloat,
    refetch: checkFloat,
  };
}
