import type { StrengthUnit } from '@/src/core/types/domain';

export function validateStrengthFields(
  amountInput: string,
  unit: StrengthUnit | undefined,
  label: string,
): { amountError: string | null; unitError: string | null; value?: number } {
  const trimmed = amountInput.trim();
  let amountError: string | null = null;
  let unitError: string | null = null;

  if (!trimmed) {
    amountError = `Enter ${label.toLowerCase()}.`;
  } else {
    const value = parseFloat(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
      amountError = 'Enter a valid amount greater than zero.';
    }
  }

  if (!unit) {
    unitError = 'Select a unit before saving.';
  }

  if (amountError || unitError) {
    return { amountError, unitError };
  }

  return { amountError: null, unitError: null, value: parseFloat(trimmed) };
}
