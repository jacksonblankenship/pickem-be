import { AppError } from '@/errors';

export class GameDataSyncError extends AppError {}

export class UnknownBetTargetError extends GameDataSyncError {}
export class UnknownBetTypeError extends GameDataSyncError {}
