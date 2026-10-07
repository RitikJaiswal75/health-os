import { VERSION_PATTERN } from './constants';
import type { Version } from './types';

/** Parses `major[.minor[.patch[.build]]]`. Pre-release suffixes (`2.1.0-beta`) are rejected. */
export function parseVersion(value: unknown): Version | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!VERSION_PATTERN.test(trimmed)) return null;
  return trimmed.split('.').map((part) => Number(part));
}

/** Numeric part-by-part comparison; missing parts count as 0. */
export function compareParsedVersions(a: Version, b: Version): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Returns -1, 0, or 1. Throws on malformed input so callers can't silently misorder. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left) throw new Error(`Invalid version: ${a}`);
  if (!right) throw new Error(`Invalid version: ${b}`);
  return compareParsedVersions(left, right);
}
