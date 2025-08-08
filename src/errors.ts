export class AppError<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends Error {
  public readonly meta?: M;

  constructor(message: string, options?: { cause?: unknown; meta?: M }) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.meta = options?.meta;
  }
}
