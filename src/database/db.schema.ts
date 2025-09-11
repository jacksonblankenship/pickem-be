import { relations, sql } from 'drizzle-orm';
import {
  integer,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase';

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

export const pickStatusEnum = pgEnum('pick_status', [
  'pending',
  'won',
  'lost',
  'push',
]);

export const teamsTable = pgTable(
  'teams',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    abbr: varchar({ length: 3 }).notNull(),
    conference: varchar({ length: 255 }).notNull(),
    conference_abbr: varchar({ length: 3 }).notNull(),
    division: varchar({ length: 255 }).notNull(),
  },
  t => [
    unique().on(t.abbr),
    pgPolicy('Allow all authenticated users to read teams', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const gamesTable = pgTable(
  'games',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    external_id: text().notNull().unique(),
    createdAt: timestamp().notNull().defaultNow(),
    year: integer().notNull(),
    week: integer().notNull(),
    date: timestamp({ withTimezone: true }),
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
  t => [
    unique().on(t.year, t.week, t.home_team_id, t.away_team_id),
    pgPolicy('Allow all authenticated users to read games', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

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
  t => [
    unique().on(t.game_id, t.type, t.target),
    pgPolicy('Allow all authenticated users to read bet options', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const picksTable = pgTable(
  'picks',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    createdAt: timestamp().notNull().defaultNow(),
    user_id: uuid()
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id),
    bet_option_id: integer()
      .notNull()
      .references(() => betOptionsTable.id),
    status: pickStatusEnum().notNull().default('pending'),
  },
  t => [
    unique().on(t.user_id, t.bet_option_id),
    pgPolicy('Enable users to view their own data only', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.user_id} = ${authUid}`,
    }),
    pgPolicy('Enable insert for users based on user_id', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.user_id} = ${authUid}`,
    }),
  ],
).enableRLS();

export const gamesRelations = relations(gamesTable, ({ one, many }) => ({
  homeTeam: one(teamsTable, {
    fields: [gamesTable.home_team_id],
    references: [teamsTable.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teamsTable, {
    fields: [gamesTable.away_team_id],
    references: [teamsTable.id],
    relationName: 'awayTeam',
  }),
  betOptions: many(betOptionsTable),
}));

export const teamsRelations = relations(teamsTable, ({ many }) => ({
  homeGames: many(gamesTable, { relationName: 'homeTeam' }),
  awayGames: many(gamesTable, { relationName: 'awayTeam' }),
}));

export const betOptionsRelations = relations(
  betOptionsTable,
  ({ one, many }) => ({
    game: one(gamesTable, {
      fields: [betOptionsTable.game_id],
      references: [gamesTable.id],
    }),
    picks: many(picksTable),
  }),
);

export const picksRelations = relations(picksTable, ({ one }) => ({
  user: one(authUsers, {
    fields: [picksTable.user_id],
    references: [authUsers.id],
  }),
  betOption: one(betOptionsTable, {
    fields: [picksTable.bet_option_id],
    references: [betOptionsTable.id],
  }),
}));

export const usersRelations = relations(authUsers, ({ many }) => ({
  picks: many(picksTable),
}));
