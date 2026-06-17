CREATE TYPE "public"."quotation_supplier_status" AS ENUM('INVITED', 'RESPONDED', 'DECLINED');--> statement-breakpoint
ALTER TABLE "quotation_invites" RENAME TO "quotation_suppliers";--> statement-breakpoint
ALTER TABLE "quotation_suppliers" DROP CONSTRAINT "quotation_invites_quotation_id_quotations_id_fk";--> statement-breakpoint
ALTER TABLE "quotation_suppliers" DROP CONSTRAINT "quotation_invites_supplier_id_suppliers_id_fk";--> statement-breakpoint
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_created_by_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "quotations" RENAME COLUMN "created_by_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ALTER COLUMN "status" SET DATA TYPE "public"."quotation_supplier_status" USING "status"::"public"."quotation_supplier_status";--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ALTER COLUMN "status" SET DEFAULT 'INVITED';--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ADD COLUMN "invited_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_suppliers" DROP COLUMN "sent_at";--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "number" varchar(20);--> statement-breakpoint
UPDATE "quotations" q SET "number" = sub.generated FROM (
	SELECT "id",
		'COT-' || to_char("created_at", 'YYYY') || '-' || lpad(
			(row_number() OVER (
				PARTITION BY "company_id", date_part('year', "created_at")
				ORDER BY "created_at", "id"
			))::text, 4, '0'
		) AS generated
	FROM "quotations"
) sub WHERE q."id" = sub."id" AND q."number" IS NULL;--> statement-breakpoint
ALTER TABLE "quotations" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "quotation_items" SET "description" = '' WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ALTER COLUMN "unit" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ADD CONSTRAINT "quotation_suppliers_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_suppliers" ADD CONSTRAINT "quotation_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_number_unique" UNIQUE("company_id","number");--> statement-breakpoint
DROP TYPE "public"."invite_status";
