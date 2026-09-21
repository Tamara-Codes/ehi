CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
ALTER TABLE "entry_images" ADD COLUMN "kind" "media_kind" DEFAULT 'image' NOT NULL;