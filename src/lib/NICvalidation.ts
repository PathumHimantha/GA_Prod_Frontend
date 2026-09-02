// ── NIC format validation ─────────────────────────────────────
// Old NIC: 9 digits + V or X (case insensitive) — max 10 chars
// New NIC: exactly 12 digits — no letters allowed

export const isValidNICFormat = (nic: string): boolean => {
  const old = /^[0-9]{9}[VvXx]$/.test(nic);
  const newNic = /^[0-9]{12}$/.test(nic);
  return old || newNic;
};

export const getNICValidationMessage = (nic: string): string | null => {
  if (nic.length === 0) return null;

  // Partial old NIC being typed
  if (nic.length <= 10) {
    const digitsOnly = /^[0-9]+$/.test(nic);
    const endsWithLetter = /^[0-9]{9}[VvXxOo]$/.test(nic);

    if (!digitsOnly && !endsWithLetter) {
      return "Only digits allowed (or end with V/X/O for old NIC)";
    }
    if (nic.length === 10 && !endsWithLetter) {
      return "Old NIC must end with V , O or X (e.g. 123456789V)";
    }
    return null; // still typing
  }

  // Partial new NIC being typed (11 chars — in progress)
  if (nic.length === 11) {
    if (!/^[0-9]+$/.test(nic)) return "New NIC must be 12 digits only";
    return null; // still typing
  }

  // Full length checks
  if (nic.length === 12) {
    if (!/^[0-9]{12}$/.test(nic))
      return "New NIC must be 12 digits only, no letters";
    return null; // valid new NIC
  }

  if (nic.length > 12) {
    return "NIC cannot exceed 12 characters";
  }

  return null;
};
