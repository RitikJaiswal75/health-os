import type { StrengthUnit } from '@/src/core/types/domain';
import { t } from '@/src/i18n/translate';

export function validateStrengthFields(
  amountInput: string,
  unit: StrengthUnit | undefined,
  label: string,
): { amountError: string | null; unitError: string | null; value?: number } {
  const trimmed = amountInput.trim();
  let amountError: string | null = null;
  let unitError: string | null = null;

  if (!trimmed) {
    amountError = t('strength.enterField', { field: label.toLowerCase() });
  } else {
    const value = parseFloat(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
      amountError = t('strength.invalidAmount');
    }
  }

  if (!unit) {
    unitError = t('strength.selectUnit');
  }

  if (amountError || unitError) {
    return { amountError, unitError };
  }

  return { amountError: null, unitError: null, value: parseFloat(trimmed) };
}
