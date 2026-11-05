import { readFile } from "node:fs/promises";
// Disposable PGlite only. Never loads .env or contacts a server.
export async function installManagementDatabase(db) {
 const query = async (sql, params = []) => (await db.query(sql,params)).rows;
 await db.exec(`create role anon; create role authenticated; create role migration_owner nosuperuser nobypassrls; create role booking_notification_worker nologin;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated,migration_owner; grant select,references on auth.users to migration_owner;
 grant create,usage on schema public to migration_owner; create schema storage authorization migration_owner;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 alter table storage.buckets owner to migration_owner; alter table storage.objects owner to migration_owner;
 alter table storage.buckets enable row level security; alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;
 alter default privileges for role migration_owner grant all on tables to public,anon,authenticated;
 alter default privileges for role migration_owner grant execute on functions to public,anon,authenticated;`);
 await db.exec((await query("select format('grant create on database %I to migration_owner',current_database()) sql"))[0].sql);
 await db.exec("set role migration_owner");
 for (const name of ["202610220001_customer_bookings.sql","202610220002_admin_documents.sql","202611020001_hotel_reservations.sql","202611030001_order_notifications.sql","202611050001_admin_site_management.sql"]) await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
}
