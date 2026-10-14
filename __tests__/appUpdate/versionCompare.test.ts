import { compareVersions, parseVersion } from '../../src/features/appUpdate/versionCompare';

describe('versionCompare', () => {
  it('parses dotted numeric versions', () => {
    expect(parseVersion('2.0.2')).toEqual([2, 0, 2]);
    expect(parseVersion(' 2.1 ')).toEqual([2, 1]);
    expect(parseVersion('3')).toEqual([3]);
  });

  it('rejects malformed and pre-release versions', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('v2.0.0')).toBeNull();
    expect(parseVersion('2.0.0-beta.1')).toBeNull();
    expect(parseVersion('2..0')).toBeNull();
    expect(parseVersion(2)).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });

  it('orders numerically, part by part', () => {
    expect(compareVersions('2.10.0', '2.9.0')).toBe(1);
    expect(compareVersions('2.0.1', '2.0.2')).toBe(-1);
    expect(compareVersions('1.99.99', '2.0.0')).toBe(-1);
    expect(compareVersions('2.0.2', '2.0.2')).toBe(0);
  });

  it('treats missing parts as 0', () => {
    expect(compareVersions('2.1', '2.1.0')).toBe(0);
    expect(compareVersions('2', '2.0.1')).toBe(-1);
  });

  it('throws on malformed input', () => {
    expect(() => compareVersions('2.0.x', '2.0.0')).toThrow('Invalid version: 2.0.x');
  });
});
