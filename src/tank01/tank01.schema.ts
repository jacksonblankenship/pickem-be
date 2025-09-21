import z from 'zod';

export function tank01Response<T extends z.ZodType>(schema: T) {
  return z.object({
    statusCode: z.int(),
    body: schema,
  });
}

const tank01TeamEnum = z.literal([
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LAC',
  'LAR',
  'LV',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WSH',
]);

export enum Tank01GameStatusCode {
  NotStarted = '0',
  InProgress = '1',
  Completed = '2',
  Postponed = '3',
  Suspended = '4',
}

const gameTimeEpochSchema = z.preprocess(val => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}, z.number().nullable());

export const tank01GameSchema = z.object({
  gameID: z.string(),
  home: tank01TeamEnum,
  away: tank01TeamEnum,
  neutralSite: z.transform(val => val === 'True').pipe(z.boolean()),
  gameTime_epoch: gameTimeEpochSchema,
});

export type Tank01Game = z.infer<typeof tank01GameSchema>;

export const tank01GameStatusSchema = z.object({
  awayPts: z.coerce.number(),
  homePts: z.coerce.number(),
  gameStatusCode: z.enum(Tank01GameStatusCode),
  gameTime_epoch: gameTimeEpochSchema,
});

export type Tank01GameStatus = z.infer<typeof tank01GameStatusSchema>;

const oddsSchema = z
  .union([z.literal('even'), z.coerce.number()])
  .transform(val => {
    // even odds are +100
    if (val === 'even') return 100;

    return val;
  });

const spreadSchema = z
  .union([z.literal('PK'), z.coerce.number()])
  .transform(val => {
    // a pick 'em spread is 0
    if (val === 'PK') return 0;

    return val;
  });

export const tank01GameOddsSchema = z.object({
  totalUnder: z.coerce.number(),
  totalUnderOdds: oddsSchema,

  totalOver: z.coerce.number(),
  totalOverOdds: oddsSchema,

  awayTeamSpread: spreadSchema,
  awayTeamSpreadOdds: oddsSchema,

  homeTeamSpread: spreadSchema,
  homeTeamSpreadOdds: oddsSchema,
});

export type Tank01GameOdds = z.infer<typeof tank01GameOddsSchema>;

export const tank01TeamSchema = z.object({
  teamAbv: tank01TeamEnum,
  teamName: z.string(),
  division: z.string(),
  conferenceAbv: z.string(),
  conference: z.string(),
});

export type Tank01Team = z.infer<typeof tank01TeamSchema>;
