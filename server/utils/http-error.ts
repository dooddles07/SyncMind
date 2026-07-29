/** Thrown by controllers, caught by the route.ts delegator and turned into a
 *  { error: { code, message } } response (docs/ARCHITECTURE.md section 5). */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
