export class ApiTank01Error extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiTank01Error';
    this.cause = cause;
  }
}

export class SchemaTank01Error extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SchemaTank01Error';
    this.cause = cause;
  }
}

export class UnknownTank01Error extends Error {
  constructor(cause?: unknown) {
    super('Unknown error occurred in Tank01Service');
    this.name = 'UnknownTank01Error';
    this.cause = cause;
  }
}

export class MissingOddsError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MissingOddsError';
    this.cause = cause;
  }
}
