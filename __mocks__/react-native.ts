export const Platform = { OS: 'android', select: (obj: Record<string, unknown>) => obj.android ?? obj.default };
export default { Platform };
