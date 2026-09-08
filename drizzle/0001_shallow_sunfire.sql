CREATE TABLE "user_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	CONSTRAINT "user_sites_user_id_site_id_unique" UNIQUE("user_id","site_id")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_site_id_sites_id_fk";
--> statement-breakpoint
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "site_id";