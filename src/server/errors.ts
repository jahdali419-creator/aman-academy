/**
 * Business-rule error. `code` is a key in the `errors` message namespace, so
 * every failure can be shown to the user in their language.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export const forbidden = () => new AppError("forbidden", 403);
export const notFound = () => new AppError("not_found", 404);
