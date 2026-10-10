import { resolveUpdateState } from '../../src/features/appUpdate/updateDecision';
import type { PlatformUpdateConfig, UpdatePreferences } from '../../src/features/appUpdate/types';

const CONFIG: PlatformUpdateConfig = { latestVersion: '2.1.0', minSupportedVersion: '2.0.2' };
const NO_PREFS: UpdatePreferences = { skippedVersion: null, laterDismissed: false };

describe('resolveUpdateState', () => {
  it('forces installs below minSupportedVersion', () => {
    expect(resolveUpdateState('2.0.1', CONFIG, NO_PREFS)).toBe('force');
    expect(resolveUpdateState('1.0.0', CONFIG, NO_PREFS)).toBe('force');
  });

  it('does not force an install at minSupportedVersion', () => {
    expect(resolveUpdateState('2.0.2', CONFIG, NO_PREFS)).toBe('optional');
  });

  it('offers an optional update below latestVersion', () => {
    expect(resolveUpdateState('2.0.9', CONFIG, NO_PREFS)).toBe('optional');
  });

  it('shows nothing at or above latestVersion', () => {
    expect(resolveUpdateState('2.1.0', CONFIG, NO_PREFS)).toBe('none');
    expect(resolveUpdateState('2.2.0', CONFIG, NO_PREFS)).toBe('none');
  });

  it('hides the optional banner after Later or Skip', () => {
    expect(resolveUpdateState('2.0.2', CONFIG, { skippedVersion: null, laterDismissed: true })).toBe(
      'none',
    );
    expect(resolveUpdateState('2.0.2', CONFIG, { skippedVersion: '2.1.0', laterDismissed: false })).toBe(
      'none',
    );
  });

  it('shows the banner again when a newer version than the skipped one ships', () => {
    expect(resolveUpdateState('2.0.2', CONFIG, { skippedVersion: '2.0.9', laterDismissed: false })).toBe(
      'optional',
    );
  });

  it('never lets Later or Skip suppress a force update', () => {
    expect(resolveUpdateState('2.0.1', CONFIG, { skippedVersion: '2.1.0', laterDismissed: true })).toBe(
      'force',
    );
  });

  it('shows nothing without platform config', () => {
    expect(resolveUpdateState('1.0.0', undefined, NO_PREFS)).toBe('none');
  });

  it('forces nobody when minSupportedVersion is missing', () => {
    expect(resolveUpdateState('1.0.0', { latestVersion: '2.1.0' }, NO_PREFS)).toBe('optional');
  });

  it('shows nothing for a malformed current version', () => {
    expect(resolveUpdateState('', CONFIG, NO_PREFS)).toBe('none');
    expect(resolveUpdateState(undefined, CONFIG, NO_PREFS)).toBe('none');
    expect(resolveUpdateState('2.0.0-beta', CONFIG, NO_PREFS)).toBe('none');
  });
});
