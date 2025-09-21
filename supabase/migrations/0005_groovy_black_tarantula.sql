ALTER TABLE "games" ADD COLUMN "neutral_site" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "system_status";--> statement-breakpoint
DROP TYPE "public"."system_status";