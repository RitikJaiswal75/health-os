export const Platform = {
  OS: 'android',
  Version: 34,
  constants: { Manufacturer: 'samsung', Model: 'SM-S911B' },
  select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
};
export const I18nManager = {
  isRTL: false,
  allowRTL: () => undefined,
  forceRTL: () => undefined,
};
export default { Platform, I18nManager };
