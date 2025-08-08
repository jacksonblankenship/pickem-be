import { z } from 'zod';

export const configSchema = z.object({
  RAPID_API_KEY: z.string().min(1),
  RAPID_API_HOST: z.string().min(1),
  DATABASE_URL: z.string().min(1),
});
