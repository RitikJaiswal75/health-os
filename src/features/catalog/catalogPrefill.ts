import type { MedicationType, StrengthUnit } from '../../core/types/domain';
import { STRENGTH_UNITS } from '../../core/types/domain';
import type { CatalogResult } from './catalogService';

export interface CatalogPrefill {
  medicationType?: MedicationType;
  strengthValue?: number;
  strengthUnit?: StrengthUnit;
}

const TYPE_PATTERNS: ReadonlyArray<{ pattern: RegExp; type: MedicationType }> = [
  { pattern: /\bsoftgel\b/, type: 'softgel_capsule' },
  { pattern: /\bcapsule\b|\bcapsules\b/, type: 'capsule' },
  { pattern: /\btablet\b|\btablets\b|\btab\b/, type: 'tablet' },
  { pattern: /\bsyrup\b|\bsuspension\b/, type: 'liquid' },
  { pattern: /\bdrops\b|\bdrop\b/, type: 'drops' },
  { pattern: /\binject(?:able|ion)\b|\bvial\b|\bampoule\b/, type: 'injectable' },
  { pattern: /\binhaler\b/, type: 'inhaler' },
  { pattern: /\bcream\b/, type: 'cream' },
  { pattern: /\bgel\b/, type: 'gel' },
  { pattern: /\bfoam\b/, type: 'foam' },
  { pattern: /\bgumm(?:y|ies)\b/, type: 'gummy' },
  { pattern: /\bpowder\b|\bsachet\b/, type: 'powder' },
  { pattern: /\btopical\b|\boltment\b/, type: 'topical' },
  { pattern: /\bdevice\b/, type: 'device' },
  { pattern: /\b\d+\s*ml\b/, type: 'liquid' },
];

const STRENGTH_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|%|units)\b/i;

function normalizeStrengthUnit(raw: string): StrengthUnit | undefined {
  const lower = raw.toLowerCase();
  if (lower === 'iu') return 'IU';
  if ((STRENGTH_UNITS as readonly string[]).includes(lower)) {
    return lower as StrengthUnit;
  }
  return undefined;
}

/** Infer medication type from catalog form label and/or medicine name. */
export function inferMedicationTypeFromCatalog(
  formLabel?: string,
  name?: string,
): MedicationType | undefined {
  const haystack = `${formLabel ?? ''} ${name ?? ''}`.toLowerCase();
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(haystack)) return type;
  }
  if (/\bsupplement\b/.test(haystack)) return 'tablet';
  return undefined;
}

/** Parse the first dose amount from a catalog strength string. */
export function parseStrengthFromCatalog(
  strength?: string,
): { value?: number; unit?: StrengthUnit } {
  if (!strength?.trim()) return {};

  const match = strength.match(STRENGTH_PATTERN);
  if (!match) return {};

  const value = Number.parseFloat(match[1]);
  const unit = normalizeStrengthUnit(match[2]);
  if (Number.isNaN(value) || !unit) return {};

  return { value, unit };
}

/** Build configure-screen defaults when a catalog row includes strength metadata. */
export function buildCatalogPrefill(
  item: Pick<CatalogResult, 'strength' | 'type' | 'name'>,
): CatalogPrefill | null {
  if (!item.strength?.trim()) return null;

  const medicationType = inferMedicationTypeFromCatalog(item.type, item.name);
  const parsed = parseStrengthFromCatalog(item.strength);

  return {
    medicationType,
    strengthValue: parsed.value,
    strengthUnit: parsed.unit,
  };
}
