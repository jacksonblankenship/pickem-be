import z from 'zod';
import { tank01GameSchema } from './tank01.schema';

export type Tank01Game = z.infer<typeof tank01GameSchema>;
