import { AppError } from '@/errors';

export class RepositoryError extends AppError {}
export class NotFoundError extends AppError {}

export class TeamRepositoryError extends RepositoryError {}
export class GameRepositoryError extends RepositoryError {}
export class BetOptionRepositoryError extends RepositoryError {}

export class TeamNotFoundError extends NotFoundError {}
export class GameNotFoundError extends NotFoundError {}
