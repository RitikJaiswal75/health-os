export const documentDirectory = 'file:///mock/documents/';
export const cacheDirectory = 'file:///mock/cache/';
export const getInfoAsync = jest.fn(async () => ({ exists: false }));
export const makeDirectoryAsync = jest.fn(async () => undefined);
export const copyAsync = jest.fn(async () => undefined);
