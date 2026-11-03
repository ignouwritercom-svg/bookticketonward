-- Apply only to a confirmed development project. See docs/SUPABASE_SETUP.md.
begin;
create schema if not exists booking_private;
revoke all on schema booking_private from public, anon, authenticated;

create table booking_private.catalog (
  singleton boolean primary key default true check (singleton),
  one_way_minor integer not null, return_minor integer not null, multi_city_minor integer not null,
  currency text not null, policy_version text not null, policy_text text not null
);
-- Defense in depth: no client policies means default-deny for non-owner roles.
-- Schema/table REVOKEs below remain required. The order RPC runs as the same
-- trusted migration owner that owns this table, so it can read the catalog.
-- Do not FORCE RLS here or add a permissive customer policy to this table.
alter table booking_private.catalog enable row level security;
insert into booking_private.catalog values (true,69900,69900,99900,'INR','preview-2026-10-22',
 'Temporary reservation document only; not a paid airline ticket or valid for boarding. Visa acceptance and fixed validity are not guaranteed. Check names, dates and application requirements. Delivery timing begins only after verified payment and complete details during working hours. Payments are not enabled yet. No fulfilment starts for unpaid orders. Final change, cancellation and refund policies must be published before payments open.');
create sequence booking_private.order_reference_seq;

create table public.booking_drafts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32768),
  revision integer not null default 1 check (revision > 0),
  status text not null default 'draft' check (status in ('draft','submitted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index booking_drafts_owner on public.booking_drafts(owner_id, updated_at desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('DT-' || lpad(nextval('booking_private.order_reference_seq')::text, 10, '0')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null unique references public.booking_drafts(id),
  idempotency_key uuid not null,
  booking_snapshot jsonb not null,
  account_email text not null, trip_type text not null check (trip_type in ('one-way','return','multi-city')),
  currency text not null check (currency = 'INR'),
  unit_price_minor integer not null check (unit_price_minor > 0),
  passenger_count integer not null check (passenger_count between 1 and 6),
  total_minor integer not null check (total_minor = unit_price_minor * passenger_count),
  policy_version text not null, policy_snapshot text not null,
  payment_status text not null default 'awaiting_payment' check (payment_status = 'awaiting_payment'),
  fulfilment_status text not null default 'not_started' check (fulfilment_status = 'not_started'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,idempotency_key)
);
create index orders_owner on public.orders(owner_id,created_at desc);
create table public.order_sectors (
  order_id uuid not null references public.orders(id) on delete cascade,
  position integer not null check(position between 1 and 4),
  origin text not null, destination text not null, departure date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(order_id,position)
);
create table public.order_passengers (
  order_id uuid not null references public.orders(id) on delete cascade,
  position integer not null check(position between 1 and 6),
  given_names text not null, surname text not null, single_name boolean not null,
  dob date not null, sex text not null check (sex in ('F','M','X')), nationality text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(order_id,position)
);
create table public.order_contacts (
  order_id uuid primary key references public.orders(id) on delete cascade,
  account_email text not null, channel text not null check(channel in ('email','whatsapp')),
  whatsapp text not null, alternate_contact text not null, purpose text not null,
  appointment_date date, special_instructions text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.booking_drafts enable row level security;
alter table public.orders enable row level security;
alter table public.order_sectors enable row level security;
alter table public.order_passengers enable row level security;
alter table public.order_contacts enable row level security;
revoke all on public.booking_drafts, public.orders, public.order_sectors, public.order_passengers, public.order_contacts from public, anon, authenticated;
grant select on public.booking_drafts, public.orders, public.order_sectors, public.order_passengers, public.order_contacts to authenticated;
create policy draft_owner_read on public.booking_drafts for select to authenticated using (owner_id = (select auth.uid()));
create policy order_owner_read on public.orders for select to authenticated using (owner_id = (select auth.uid()));
create policy sector_owner_read on public.order_sectors for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and o.owner_id = (select auth.uid())));
create policy passenger_owner_read on public.order_passengers for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and o.owner_id = (select auth.uid())));
create policy contact_owner_read on public.order_contacts for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and o.owner_id = (select auth.uid())));

-- Only these narrow SECURITY DEFINER operations can mutate customer data.
-- No user metadata, client owner, prices, role or status fields are trusted.
create function booking_private.customer_email() returns text
language plpgsql security definer set search_path = '' as $$
declare email text;
begin
  select u.email into email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous;
  if email is null then raise exception using errcode='42501', message='Authentication required'; end if;
  return email;
end $$;

create function booking_private.valid_date(value text) returns date
language plpgsql immutable set search_path = '' as $$
declare result date;
begin
  if value is null or value !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid booking'; end if;
  result := value::date;
  if to_char(result,'YYYY-MM-DD') <> value then raise exception 'Invalid booking'; end if;
  return result;
end $$;

-- Defense in depth for direct RPC callers; the app also uses the shared Zod schema.
create function booking_private.validate_booking(b jsonb, email text) returns void
language plpgsql set search_path = '' as $$
declare trip jsonb := b->'trip'; contact jsonb := b->'communication'; item jsonb;
  today date := (now() at time zone 'Asia/Kolkata')::date; depart date; previous date; birthday date;
  count_sectors integer; count_passengers integer; field text; max_len integer;
begin
  if jsonb_typeof(b) is distinct from 'object' or octet_length(b::text)>32768
    or jsonb_typeof(trip) is distinct from 'object' or jsonb_typeof(contact) is distinct from 'object'
    or jsonb_typeof(trip->'sectors') is distinct from 'array' or jsonb_typeof(b->'passengers') is distinct from 'array'
    or (b->'confirmations') is distinct from '{"detailsCorrect":true,"termsAccepted":true}'::jsonb
    or (trip->>'type') is null or (trip->>'type') not in ('one-way','return','multi-city')
    or lower(contact->>'accountEmail') is distinct from lower(email)
    or (contact->>'channel') is null or (contact->>'channel') not in ('email','whatsapp')
    then raise exception 'Invalid booking'; end if;
  count_sectors := jsonb_array_length(trip->'sectors'); count_passengers := jsonb_array_length(b->'passengers');
  if count_passengers not between 1 and 6 or count_sectors not between 1 and 4
    or ((trip->>'type')='multi-city' and count_sectors<2)
    or ((trip->>'type')<>'multi-city' and count_sectors<>1) then raise exception 'Invalid booking'; end if;
  for item in select value from jsonb_array_elements(trip->'sectors') loop
    if jsonb_typeof(item->'from') is distinct from 'string' or jsonb_typeof(item->'to') is distinct from 'string'
      or length(trim(item->>'from')) not between 2 and 100 or length(trim(item->>'to')) not between 2 and 100
      or lower(regexp_replace(trim(item->>'from'),'\s+',' ','g')) = lower(regexp_replace(trim(item->>'to'),'\s+',' ','g'))
      then raise exception 'Invalid booking'; end if;
    depart := booking_private.valid_date(item->>'departure');
    if depart < today or depart < previous then raise exception 'Invalid booking'; end if;
    previous := depart;
  end loop;
  if trip->>'type'='return' and booking_private.valid_date(trip->>'returnDate') < previous then raise exception 'Invalid booking'; end if;
  for item in select value from jsonb_array_elements(b->'passengers') loop
    if jsonb_typeof(item->'givenNames') is distinct from 'string' or length(trim(item->>'givenNames')) not between 1 and 100
      or jsonb_typeof(item->'surname') is distinct from 'string' or length(item->>'surname')>100
      or jsonb_typeof(item->'singleName') is distinct from 'boolean'
      or (item->>'singleName'='false' and length(trim(item->>'surname'))=0)
      or (item->>'sex') is null or (item->>'sex') not in ('F','M','X')
      or jsonb_typeof(item->'nationality') is distinct from 'string' or length(item->>'nationality')>80
      then raise exception 'Invalid booking'; end if;
    birthday := booking_private.valid_date(item->>'dob');
    if birthday > today or birthday > booking_private.valid_date(trip->'sectors'->0->>'departure') then raise exception 'Invalid booking'; end if;
  end loop;
  for field,max_len in select * from (values ('accountEmail',254),('whatsapp',30),('alternateContact',254),('purpose',120),('appointmentDate',10),('specialInstructions',2000)) as limits(f,n) loop
    if jsonb_typeof(contact->field) is distinct from 'string' or length(contact->>field)>max_len then raise exception 'Invalid booking'; end if;
  end loop;
  if contact->>'channel'='whatsapp' and regexp_replace(contact->>'whatsapp','[\s()-]','','g') !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'Invalid booking'; end if;
  if contact->>'alternateContact'<>'' and contact->>'alternateContact' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and regexp_replace(contact->>'alternateContact','[\s()-]','','g') !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'Invalid booking'; end if;
  if contact->>'appointmentDate'<>'' and booking_private.valid_date(contact->>'appointmentDate')<today then raise exception 'Invalid booking'; end if;
end $$;

create function public.save_booking_draft(p_id uuid, p_revision integer, p_data jsonb)
returns public.booking_drafts language plpgsql security definer set search_path = '' as $$
declare email text := booking_private.customer_email(); row public.booking_drafts;
begin
  if p_id is null or p_revision is null or p_revision<0 or p_data is null then raise exception 'Invalid booking'; end if;
  perform booking_private.validate_booking(p_data,email);
  -- Serialize saves and order creation for this UUID, even before a row exists.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into row from public.booking_drafts where id=p_id;
  if found then
    if row.owner_id<>auth.uid() then raise exception using errcode='42501',message='Unavailable'; end if;
    if row.status<>'draft' then raise exception using errcode='P0001',message='Draft conflict'; end if;
    -- Exact retry after a lost response is idempotent, without allowing stale overwrites.
    if row.data = p_data and row.revision in (p_revision,p_revision+1) then return row; end if;
    if row.revision<>p_revision then raise exception using errcode='P0001',message='Draft conflict'; end if;
    update public.booking_drafts set data=p_data,revision=revision+1,updated_at=now() where id=p_id returning * into row;
  else
    if p_revision<>0 then raise exception using errcode='P0001',message='Draft conflict'; end if;
    insert into public.booking_drafts(id,owner_id,data) values(p_id,auth.uid(),p_data) returning * into row;
  end if;
  return row;
end $$;

create function public.create_booking_order(p_draft_id uuid,p_revision integer,p_idempotency_key uuid,p_unit_price_minor integer,p_policy_version text,p_policy_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare email text := booking_private.customer_email(); draft public.booking_drafts; existing public.orders;
  catalog booking_private.catalog; booking jsonb; contact jsonb; item jsonb; ordinal bigint;
  price integer; order_id uuid; passenger_count integer;
begin
  if p_idempotency_key is null or p_draft_id is null or p_revision is null or p_revision<1 then raise exception 'Invalid booking'; end if;
  -- Lock order is fixed: customer idempotency key, then draft. Serializes concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_idempotency_key::text,1));
  perform pg_advisory_xact_lock(hashtextextended(p_draft_id::text,0));
  select * into existing from public.orders where owner_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if existing.draft_id<>p_draft_id then raise exception 'Idempotency conflict'; end if;
    return existing.id;
  end if;
  select * into draft from public.booking_drafts where id=p_draft_id and owner_id=auth.uid() for update;
  if not found then raise exception using errcode='42501',message='Unavailable'; end if;
  select * into existing from public.orders where draft_id=p_draft_id and owner_id=auth.uid();
  if found then return existing.id; end if;
  if draft.status<>'draft' or draft.revision<>p_revision then raise exception 'Draft conflict'; end if;
  booking := draft.data; contact := booking->'communication';
  perform booking_private.validate_booking(booking,email);
  select * into strict catalog from booking_private.catalog where singleton;
  price := case booking->'trip'->>'type' when 'one-way' then catalog.one_way_minor when 'return' then catalog.return_minor else catalog.multi_city_minor end;
  if p_unit_price_minor is distinct from price or p_policy_version is distinct from catalog.policy_version or p_policy_text is distinct from catalog.policy_text then raise exception 'Catalog mismatch'; end if;
  passenger_count := jsonb_array_length(booking->'passengers');
  insert into public.orders(owner_id,draft_id,idempotency_key,booking_snapshot,account_email,trip_type,currency,unit_price_minor,passenger_count,total_minor,policy_version,policy_snapshot)
    values(auth.uid(),p_draft_id,p_idempotency_key,booking,email,booking->'trip'->>'type',catalog.currency,price,passenger_count,price*passenger_count,catalog.policy_version,catalog.policy_text) returning id into order_id;
  for item,ordinal in select value, ordinality from jsonb_array_elements(booking->'trip'->'sectors') with ordinality loop
    insert into public.order_sectors(order_id,position,origin,destination,departure) values(order_id,ordinal,item->>'from',item->>'to',(item->>'departure')::date);
  end loop;
  if booking->'trip'->>'type'='return' then
    item := booking->'trip'->'sectors'->0;
    insert into public.order_sectors(order_id,position,origin,destination,departure) values(order_id,2,item->>'to',item->>'from',(booking->'trip'->>'returnDate')::date);
  end if;
  for item,ordinal in select value, ordinality from jsonb_array_elements(booking->'passengers') with ordinality loop
    insert into public.order_passengers(order_id,position,given_names,surname,single_name,dob,sex,nationality)
      values(order_id,ordinal,item->>'givenNames',case when (item->>'singleName')::boolean then '' else item->>'surname' end,(item->>'singleName')::boolean,(item->>'dob')::date,item->>'sex',item->>'nationality');
  end loop;
  insert into public.order_contacts(order_id,account_email,channel,whatsapp,alternate_contact,purpose,appointment_date,special_instructions)
    values(order_id,email,contact->>'channel',contact->>'whatsapp',contact->>'alternateContact',contact->>'purpose',nullif(contact->>'appointmentDate','')::date,contact->>'specialInstructions');
  update public.booking_drafts set status='submitted',updated_at=now() where id=p_draft_id;
  return order_id;
end $$;

revoke all on all tables in schema booking_private from public,anon,authenticated;
revoke all on all sequences in schema booking_private from public,anon,authenticated;
revoke all on all functions in schema booking_private from public,anon,authenticated;
revoke all on function public.save_booking_draft(uuid,integer,jsonb) from public,anon,authenticated;
revoke all on function public.create_booking_order(uuid,integer,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.save_booking_draft(uuid,integer,jsonb) to authenticated;
grant execute on function public.create_booking_order(uuid,integer,uuid,integer,text,text) to authenticated;
-- No Storage bucket or permissive storage.objects policies are introduced in Phase 3.
commit;
