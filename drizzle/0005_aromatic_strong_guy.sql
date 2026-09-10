ALTER TABLE "entries" ALTER COLUMN "material_on_site" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "material_missing_note" text;