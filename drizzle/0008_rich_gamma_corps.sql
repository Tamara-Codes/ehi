CREATE TABLE "notification_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"notification_time" time DEFAULT '16:00:00' NOT NULL,
	"notify_days" integer[] DEFAULT '{0,1,2,3,4,5,6}' NOT NULL,
	"last_notified_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
