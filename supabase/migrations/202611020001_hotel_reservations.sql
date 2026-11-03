-- Additive flight/hotel/combo support. Apply after both prior migrations; never replay them.
begin;
create table booking_private.reservation_catalog (
 singleton boolean primary key default true check(singleton),
 hotel_minor integer not null check(hotel_minor>0), combo_discount_minor integer not null check(combo_discount_minor>=0),
 policy_version text not null, policy_text text not null
);
alter table booking_private.reservation_catalog enable row level security;
revoke all on booking_private.reservation_catalog from public,anon,authenticated;
insert into booking_private.reservation_catalog values(true,69900,19900,'preview-2026-11-02-reservations',
'Service fees cover temporary flight and/or hotel reservation documents selected in this order, not paid airline tickets or paid hotel accommodation. Visa acceptance, availability and fixed reservation validity are not guaranteed. Review all traveller names, flight dates, hotel cities and stay dates. Hotel fees are per traveller per stay, not per night or room; combo discount applies once per traveller. Fulfilment starts only after verified payment and complete details during working hours. Payments are not enabled yet. Final change, cancellation and refund policies must be published before payments open.');
alter table public.orders add column service_type text not null default 'flight' check(service_type in ('flight','hotel','combo'));
alter table public.orders alter column trip_type drop not null;
alter table public.orders add constraint order_service_trip check((service_type='hotel' and trip_type is null) or (service_type<>'hotel' and trip_type is not null));
create index admin_order_service on public.orders(service_type,created_at desc);
create table public.order_hotels (
 order_id uuid not null references public.orders(id) on delete cascade,
 position integer not null check(position between 1 and 4), city text not null,country text not null,
 check_in date not null,check_out date not null,rooms integer not null check(rooms between 1 and 6),preference text not null,
 created_at timestamptz not null default now(), primary key(order_id,position),check(check_out>check_in and check_out-check_in<=30)
);
alter table public.order_hotels enable row level security;
revoke all on public.order_hotels from public,anon,authenticated;
grant select on public.order_hotels to authenticated;
create policy hotel_owner_read on public.order_hotels for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.owner_id=(select auth.uid())));
create policy hotel_staff_read on public.order_hotels for select to authenticated using((select public.is_booking_staff()));
alter table public.order_documents add column kind text not null default 'flight' check(kind in ('flight','hotel','combined'));
create function booking_private.documents_complete(p_order uuid,p_published boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select case o.service_type
 when 'flight' then exists(select 1 from public.order_documents d where d.order_id=o.id and d.state='ready' and d.withdrawn_at is null and d.kind='flight' and (not p_published or d.published_at is not null))
 when 'hotel' then exists(select 1 from public.order_documents d where d.order_id=o.id and d.state='ready' and d.withdrawn_at is null and d.kind='hotel' and (not p_published or d.published_at is not null))
 else exists(select 1 from public.order_documents d where d.order_id=o.id and d.state='ready' and d.withdrawn_at is null and d.kind='combined' and (not p_published or d.published_at is not null))
 or (select count(distinct d.kind)=2 from public.order_documents d where d.order_id=o.id and d.state='ready' and d.withdrawn_at is null and d.kind in ('flight','hotel') and (not p_published or d.published_at is not null)) end
 from public.orders o where o.id=p_order
$$;
revoke all on function booking_private.documents_complete(uuid,boolean) from public,anon,authenticated;

create or replace function booking_private.validate_booking(b jsonb, email text) returns void
language plpgsql set search_path = '' as $$
declare service text := coalesce(b->>'service','flight'); hotels jsonb := b->'hotels'; hotel jsonb; previous_checkout date; checkin date; checkout date; first_date date; rooms integer; trip jsonb := b->'trip'; contact jsonb := b->'communication'; item jsonb;
  today date := (now() at time zone 'Asia/Kolkata')::date; depart date; previous date; birthday date;
  count_sectors integer; count_passengers integer; field text; max_len integer;
begin
  if service not in ('flight','hotel','combo') then raise exception 'Invalid service'; end if;
  if service='hotel' and trip is distinct from '{"type":"one-way","sectors":[],"returnDate":""}'::jsonb then raise exception 'Hotel-only booking cannot contain flight details'; end if;
  if jsonb_typeof(b) is distinct from 'object' or octet_length(b::text)>32768
    or jsonb_typeof(trip) is distinct from 'object' or jsonb_typeof(contact) is distinct from 'object'
    or jsonb_typeof(trip->'sectors') is distinct from 'array' or jsonb_typeof(b->'passengers') is distinct from 'array'
    or (b->'confirmations') is distinct from '{"detailsCorrect":true,"termsAccepted":true}'::jsonb
    or (trip->>'type') is null or (trip->>'type') not in ('one-way','return','multi-city')
    or lower(contact->>'accountEmail') is distinct from lower(email)
    or (contact->>'channel') is null or (contact->>'channel') not in ('email','whatsapp')
    then raise exception 'Invalid booking'; end if;
  count_sectors := jsonb_array_length(trip->'sectors'); count_passengers := jsonb_array_length(b->'passengers');
  if count_passengers not between 1 and 6 then raise exception 'Invalid travellers'; end if;
  if service<>'hotel' then
  if count_sectors not between 1 and 4
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
  end if;
  if service in ('hotel','combo') then
    if jsonb_typeof(hotels) is distinct from 'array' then raise exception 'Invalid stays'; end if;
    if jsonb_array_length(hotels) not between 1 and 4 then raise exception 'Invalid stays'; end if;
    for hotel in select value from jsonb_array_elements(hotels) loop
      if jsonb_typeof(hotel) is distinct from 'object' or jsonb_typeof(hotel->'city') is distinct from 'string' or length(trim(hotel->>'city')) not between 2 and 100
        or jsonb_typeof(hotel->'country') is distinct from 'string' or length(trim(hotel->>'country')) not between 2 and 80
        or jsonb_typeof(hotel->'preference') is distinct from 'string' or length(hotel->>'preference')>120
        or jsonb_typeof(hotel->'rooms') is distinct from 'number' or (hotel->>'rooms') !~ '^[1-6]$' then raise exception 'Invalid stay'; end if;
      rooms := (hotel->>'rooms')::integer;
      if rooms>count_passengers then raise exception 'Room count exceeds travellers'; end if;
      checkin := booking_private.valid_date(hotel->>'checkIn'); checkout := booking_private.valid_date(hotel->>'checkOut');
      if checkin<today or checkout<=checkin or checkout-checkin>30 or checkin<previous_checkout then raise exception 'Invalid stay dates'; end if;
      previous_checkout := checkout;
    end loop;
  elsif hotels is not null and hotels<>'[]'::jsonb then raise exception 'Flight-only booking cannot contain hotel details'; end if;
  first_date := case when service='hotel' then booking_private.valid_date(hotels->0->>'checkIn') else booking_private.valid_date(trip->'sectors'->0->>'departure') end;
  for item in select value from jsonb_array_elements(b->'passengers') loop
    if jsonb_typeof(item->'givenNames') is distinct from 'string' or length(trim(item->>'givenNames')) not between 1 and 100
      or jsonb_typeof(item->'surname') is distinct from 'string' or length(item->>'surname')>100
      or jsonb_typeof(item->'singleName') is distinct from 'boolean'
      or (item->>'singleName'='false' and length(trim(item->>'surname'))=0)
      or (item->>'sex') is null or (item->>'sex') not in ('F','M','X')
      or jsonb_typeof(item->'nationality') is distinct from 'string' or length(item->>'nationality')>80
      then raise exception 'Invalid booking'; end if;
    birthday := booking_private.valid_date(item->>'dob');
    if birthday > today or birthday > first_date then raise exception 'Invalid booking'; end if;
  end loop;
  for field,max_len in select * from (values ('accountEmail',254),('whatsapp',30),('alternateContact',254),('purpose',120),('appointmentDate',10),('specialInstructions',2000)) as limits(f,n) loop
    if jsonb_typeof(contact->field) is distinct from 'string' or length(contact->>field)>max_len then raise exception 'Invalid booking'; end if;
  end loop;
  if contact->>'channel'='whatsapp' and regexp_replace(contact->>'whatsapp','[\s()-]','','g') !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'Invalid booking'; end if;
  if contact->>'alternateContact'<>'' and contact->>'alternateContact' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and regexp_replace(contact->>'alternateContact','[\s()-]','','g') !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'Invalid booking'; end if;
  if contact->>'appointmentDate'<>'' and booking_private.valid_date(contact->>'appointmentDate')<today then raise exception 'Invalid booking'; end if;
end $$;
create or replace function public.create_booking_order(p_draft_id uuid,p_revision integer,p_idempotency_key uuid,p_unit_price_minor integer,p_policy_version text,p_policy_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare email text := booking_private.customer_email(); draft public.booking_drafts; existing public.orders;
  catalog booking_private.catalog; reservation_catalog booking_private.reservation_catalog; service text; booking jsonb; contact jsonb; item jsonb; ordinal bigint;
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
  booking := draft.data; contact := booking->'communication'; service := coalesce(booking->>'service','flight');
  perform booking_private.validate_booking(booking,email);
  select * into strict catalog from booking_private.catalog where singleton;
  price := case booking->'trip'->>'type' when 'one-way' then catalog.one_way_minor when 'return' then catalog.return_minor else catalog.multi_city_minor end;
  if service<>'flight' then
    select * into strict reservation_catalog from booking_private.reservation_catalog where singleton;
    price := case when service='hotel' then 0 else price end + reservation_catalog.hotel_minor * jsonb_array_length(booking->'hotels') - case when service='combo' then reservation_catalog.combo_discount_minor else 0 end;
    catalog.policy_version := reservation_catalog.policy_version; catalog.policy_text := reservation_catalog.policy_text;
  end if;
  if p_unit_price_minor is distinct from price or p_policy_version is distinct from catalog.policy_version or p_policy_text is distinct from catalog.policy_text then raise exception 'Catalog mismatch'; end if;
  passenger_count := jsonb_array_length(booking->'passengers');
  insert into public.orders(owner_id,draft_id,idempotency_key,booking_snapshot,account_email,service_type,trip_type,currency,unit_price_minor,passenger_count,total_minor,policy_version,policy_snapshot)
    values(auth.uid(),p_draft_id,p_idempotency_key,booking,email,service,case when service='hotel' then null else booking->'trip'->>'type' end,catalog.currency,price,passenger_count,price*passenger_count,catalog.policy_version,catalog.policy_text) returning id into order_id;
  if service<>'hotel' then
  for item,ordinal in select value, ordinality from jsonb_array_elements(booking->'trip'->'sectors') with ordinality loop
    insert into public.order_sectors(order_id,position,origin,destination,departure) values(order_id,ordinal,item->>'from',item->>'to',(item->>'departure')::date);
  end loop;
  if booking->'trip'->>'type'='return' then
    item := booking->'trip'->'sectors'->0;
    insert into public.order_sectors(order_id,position,origin,destination,departure) values(order_id,2,item->>'to',item->>'from',(booking->'trip'->>'returnDate')::date);
  end if;
  end if;
  if service<>'flight' then
    for item,ordinal in select value,ordinality from jsonb_array_elements(booking->'hotels') with ordinality loop
      insert into public.order_hotels(order_id,position,city,country,check_in,check_out,rooms,preference)
      values(order_id,ordinal,item->>'city',item->>'country',(item->>'checkIn')::date,(item->>'checkOut')::date,(item->>'rooms')::integer,item->>'preference');
    end loop;
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
drop function public.admin_order_action(uuid,text,uuid,text,integer);
create function public.admin_order_action(p_order_id uuid,p_action text,p_document_id uuid default null,p_note text default null,p_size integer default null,p_kind text default 'flight')
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; d public.order_documents; result jsonb := '{}'::jsonb; event_name text; new_id uuid;
begin
  perform booking_private.require_staff();
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='42501',message='Order unavailable'; end if;
  if p_action='note' then
    if p_note is null or length(trim(p_note)) not between 1 and 2000 then raise exception 'Invalid note'; end if;
    insert into public.order_staff_notes(order_id,actor_id,body) values(o.id,auth.uid(),trim(p_note));
    event_name := 'note_added';
  else
    if o.payment_status<>'paid' then raise exception 'Verified payment required'; end if;
    if p_action='start' then
      if o.fulfilment_status<>'not_started' then raise exception 'Status conflict'; end if;
      update public.orders set fulfilment_status='processing',updated_at=now() where id=o.id;
      event_name := 'processing';
    elsif p_action='reserve' then
      if o.fulfilment_status='not_started' or p_size is null or p_size not between 1 and 10485760 then raise exception 'Invalid upload'; end if;
      if p_kind is null or not ((o.service_type='flight' and p_kind='flight') or (o.service_type='hotel' and p_kind='hotel') or (o.service_type='combo' and p_kind in ('flight','hotel','combined'))) then raise exception 'Invalid document kind'; end if;
      new_id := gen_random_uuid();
      insert into public.order_documents(id,order_id,version,object_name,size_bytes,actor_id,kind)
        select new_id,o.id,coalesce(max(version),0)+1,o.id::text || '/' || new_id::text || '.pdf',p_size,auth.uid(),p_kind
        from public.order_documents where order_id=o.id returning * into d;
      return to_jsonb(d);
    else
      select * into d from public.order_documents where id=p_document_id and order_id=o.id for update;
      if not found then raise exception 'Document unavailable'; end if;
      if p_action='complete' then
        if d.state='ready' then return to_jsonb(d); end if;
        if d.state<>'pending' or not exists(select 1 from storage.objects where bucket_id='order-documents' and name=d.object_name
          and metadata->>'mimetype'='application/pdf' and (metadata->>'size')::bigint=d.size_bytes) then raise exception 'Upload incomplete'; end if;
        update public.order_documents set state='ready' where id=d.id;
        update public.orders set fulfilment_status=case when booking_private.documents_complete(o.id,false) then 'documents_ready' else 'processing' end,updated_at=now() where id=o.id;
        event_name := 'document_uploaded';
      elsif p_action='abort' then
        if d.state<>'pending' then raise exception 'Status conflict'; end if;
        update public.order_documents set state='failed' where id=d.id;
        event_name := 'upload_failed';
      elsif p_action='publish' then
        if d.state<>'ready' or d.withdrawn_at is not null then raise exception 'Document unavailable'; end if;
        if d.published_at is not null then return to_jsonb(d); end if;
        update public.order_documents set published_at=now() where id=d.id;
        event_name := 'document_published';
      elsif p_action='withdraw' then
        if d.state<>'ready' then raise exception 'Document unavailable'; end if;
        if d.withdrawn_at is not null then return to_jsonb(d); end if;
        update public.order_documents set withdrawn_at=now() where id=d.id;
        if o.fulfilment_status='documents_ready' and not booking_private.documents_complete(o.id,false) then update public.orders set fulfilment_status='processing',updated_at=now() where id=o.id; end if;
        event_name := 'document_withdrawn';
      elsif p_action in ('deliver_email','deliver_whatsapp') then
        if not booking_private.documents_complete(o.id,true) then raise exception 'Publish all required document types first'; end if;
        if d.state<>'ready' or d.published_at is null or d.withdrawn_at is not null or o.fulfilment_status not in ('documents_ready','delivered') then raise exception 'Publish an available document first'; end if;
        if p_action='deliver_whatsapp' and not exists(select 1 from public.order_contacts where order_id=o.id and regexp_replace(whatsapp,'[\s()-]','','g') ~ '^\+[1-9][0-9]{6,14}$') then raise exception 'Contact unavailable'; end if;
        if exists(select 1 from public.order_audit where order_id=o.id and document_id=d.id and event=replace(p_action,'deliver_','delivered_')) then return to_jsonb(d); end if;
        update public.orders set fulfilment_status='delivered',updated_at=now() where id=o.id;
        event_name := replace(p_action,'deliver_','delivered_');
      else raise exception 'Invalid action';
      end if;
      result := jsonb_build_object('id',d.id);
    end if;
  end if;
  insert into public.order_audit(order_id,actor_id,event,document_id) values(o.id,auth.uid(),event_name,d.id);
  return result;
end $$;
revoke all on function booking_private.validate_booking(jsonb,text) from public,anon,authenticated;
revoke all on function public.create_booking_order(uuid,integer,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.create_booking_order(uuid,integer,uuid,integer,text,text) to authenticated;
revoke all on function public.admin_order_action(uuid,text,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.admin_order_action(uuid,text,uuid,text,integer,text) to authenticated;
commit;
