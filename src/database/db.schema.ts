import { sql } from 'drizzle-orm';
import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const betTypeEnum = pgEnum('bet_type', ['spread', 'total']);

export const betTargetEnum = pgEnum('bet_target', [
  'home',
  'away',
  'over',
  'under',
]);

export const systemStatusEnum = pgEnum('system_status', [
  'scheduled',
  'open',
  'closed',
  'settled',
]);

export const gameStatusEnum = pgEnum('game_status', [
  'not-started',
  'in-progress',
  'completed',
  'postponed',
  'suspended',
]);

export const pickStatusEnum = pgEnum('pick_status', ['pending', 'won', 'lost']);

export const teamsTable = pgTable('teams', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  abbr: varchar({ length: 3 }).notNull(),
  conference: varchar({ length: 255 }).notNull(),
  conference_abbr: varchar({ length: 3 }).notNull(),
  division: varchar({ length: 255 }).notNull(),
});

export const gamesTable = pgTable(
  'games',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    external_id: text().notNull().unique(),
    createdAt: timestamp().notNull().defaultNow(),
    year: integer().notNull(),
    week: integer().notNull(),
    date: timestamp().notNull(),
    home_team_id: integer()
      .references(() => teamsTable.id)
      .notNull(),
    away_team_id: integer()
      .references(() => teamsTable.id)
      .notNull(),
    home_team_score: integer().notNull().default(0),
    away_team_score: integer().notNull().default(0),
    game_status: gameStatusEnum().notNull().default('not-started'),
    system_status: systemStatusEnum().notNull().default('scheduled'),
  },
  t => [unique().on(t.year, t.week, t.home_team_id, t.away_team_id)],
);

export const betOptionsTable = pgTable(
  'bet_options',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp().notNull().defaultNow(),
    game_id: integer()
      .references(() => gamesTable.id)
      .notNull(),
    type: betTypeEnum().notNull().default('spread'),
    target: betTargetEnum().notNull(),
    line: numeric({ mode: 'number' }).notNull(),
    odds: numeric({ mode: 'number' }).notNull(),
  },
  t => [unique().on(t.game_id, t.type, t.target)],
);

export const picksTable = pgTable(
  'picks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp().notNull().defaultNow(),
    user_id: text()
      .notNull()
      .default(sql`auth.jwt()->>'sub'`),
    bet_option_id: integer().references(() => betOptionsTable.id),
  },
  t => [unique().on(t.user_id, t.bet_option_id)],
).enableRLS();
