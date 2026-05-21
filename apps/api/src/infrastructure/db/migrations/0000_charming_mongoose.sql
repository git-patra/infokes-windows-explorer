CREATE TABLE "files" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"folder_id" bigint NOT NULL,
	"name" text NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_name_unique_per_folder" UNIQUE("folder_id","name")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"parent_id" bigint,
	"name" text NOT NULL,
	"path" "ltree" NOT NULL,
	"depth" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folders_name_unique_per_parent" UNIQUE("parent_id","name")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_folder_id_idx" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "folders_parent_id_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_path_gist_idx" ON "folders" USING GIST ("path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_name_trgm_idx" ON "folders" USING GIN ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_name_trgm_idx" ON "files" USING GIN ("name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "folders_root_name_unique" ON "folders" ("name") WHERE parent_id IS NULL;