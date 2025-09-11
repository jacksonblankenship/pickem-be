CREATE TYPE "public"."bet_target" AS ENUM('home', 'away', 'over', 'under');--> statement-breakpoint
CREATE TYPE "public"."bet_type" AS ENUM('spread', 'total');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('not-started', 'in-progress', 'completed', 'postponed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."pick_status" AS ENUM('pending', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."system_status" AS ENUM('scheduled', 'open', 'closed', 'settled');--> statement-breakpoint
CREATE TABLE "bet_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bet_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"game_id" integer NOT NULL,
	"type" "bet_type" DEFAULT 'spread' NOT NULL,
	"target" "bet_target" NOT NULL,
	"line" numeric NOT NULL,
	"odds" numeric NOT NULL,
	CONSTRAINT "bet_options_game_id_type_target_unique" UNIQUE("game_id","type","target")
);
--> statement-breakpoint
ALTER TABLE "bet_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "games" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "games_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"date" timestamp,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"home_team_score" integer DEFAULT 0 NOT NULL,
	"away_team_score" integer DEFAULT 0 NOT NULL,
	"game_status" "game_status" DEFAULT 'not-started' NOT NULL,
	"system_status" "system_status" DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "games_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "games_year_week_home_team_id_away_team_id_unique" UNIQUE("year","week","home_team_id","away_team_id")
);
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "picks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "picks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"bet_option_id" integer,
	CONSTRAINT "picks_user_id_bet_option_id_unique" UNIQUE("user_id","bet_option_id")
);
--> statement-breakpoint
ALTER TABLE "picks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"abbr" varchar(3) NOT NULL,
	"conference" varchar(255) NOT NULL,
	"conference_abbr" varchar(3) NOT NULL,
	"division" varchar(255) NOT NULL,
	CONSTRAINT "teams_abbr_unique" UNIQUE("abbr")
);
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bet_options" ADD CONSTRAINT "bet_options_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_bet_option_id_bet_options_id_fk" FOREIGN KEY ("bet_option_id") REFERENCES "public"."bet_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Allow all authenticated users to read bet options" ON "bet_options" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Allow all authenticated users to read games" ON "games" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Enable users to view their own data only" ON "picks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("picks"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "Enable insert for users based on user_id" ON "picks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("picks"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "Allow all authenticated users to read teams" ON "teams" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);