import { AppError } from '@/errors';

export class GradingError extends AppError {}

export class MissingBetOptionError extends GradingError {}
export class MissingGameError extends GradingError {}
export class GameNotCompletedError extends GradingError {}
