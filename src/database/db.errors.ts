export class DatabaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;
  }
}

export class UnknownDatabaseError extends Error {
  constructor(cause?: unknown) {
    super('Unknown error occurred in DatabaseService');
    this.name = 'UnknownDatabaseError';
    this.cause = cause;
  }
}

export class DatabaseNotFoundError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseNotFoundError';
    this.cause = cause;
  }
}
