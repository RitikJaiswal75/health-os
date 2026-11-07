/** RN fetch rejects with this TypeError when offline or on DNS/TLS failure: expected, not a bug. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === 'Network request failed';
}
