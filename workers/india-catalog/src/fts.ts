/** FTS5 query sanitizer — mirrors src/features/catalog/catalogService.ts */
export function sanitizeFtsQuery(query: string): string {
  const tokens = query
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return '';
  return `${tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(' ')}*`;
}
