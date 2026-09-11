export interface IndianMedicineJsonRow {
  id?: string;
  name?: string;
  'price(₹)'?: string;
  Is_discontinued?: string;
  manufacturer_name?: string;
  type?: string;
  pack_size_label?: string;
  short_composition1?: string;
  short_composition2?: string;
}

export interface IndiaDrugRow {
  name: string;
  strength?: string;
  form?: string;
}

function isDiscontinued(value: string | undefined): boolean {
  return value?.trim().toUpperCase() === 'TRUE';
}

function buildStrength(row: IndianMedicineJsonRow): string | undefined {
  const parts = [row.short_composition1, row.short_composition2]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' + ') : undefined;
}

function buildForm(row: IndianMedicineJsonRow): string | undefined {
  const pack = row.pack_size_label?.trim();
  if (pack) return pack;
  const type = row.type?.trim();
  return type || undefined;
}

/** Maps a raw Indian medicine JSON record to a catalog drug row, or null if skipped. */
export function mapIndianMedicineRow(row: IndianMedicineJsonRow): IndiaDrugRow | null {
  const name = row.name?.trim();
  if (!name || isDiscontinued(row.Is_discontinued)) return null;

  return {
    name,
    strength: buildStrength(row),
    form: buildForm(row),
  };
}

export function parseIndianMedicineJson(raw: string): IndiaDrugRow[] {
  const parsed = JSON.parse(raw) as IndianMedicineJsonRow[];
  if (!Array.isArray(parsed)) return [];

  const drugs: IndiaDrugRow[] = [];
  for (const row of parsed) {
    const mapped = mapIndianMedicineRow(row);
    if (mapped) drugs.push(mapped);
  }
  return drugs;
}
