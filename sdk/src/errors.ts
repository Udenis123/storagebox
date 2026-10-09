/** Thrown for any non-2xx response. `code` is the API error code (e.g. `E4003` for quota exceeded). */
export class StorageBoxError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "StorageBoxError";
  }
}
