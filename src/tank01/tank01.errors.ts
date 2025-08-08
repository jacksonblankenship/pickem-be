import { AppError } from '@/errors';

export class Tank01Error<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends AppError<M> {}

export class Tank01ApiError<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends Tank01Error<M> {}

export class Tank01SchemaError<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends Tank01Error<M> {}

export class MissingOddsError<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends Tank01Error<M> {}
