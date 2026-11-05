-- Additive management workspace. Apply manually AFTER all four existing migrations.
-- Never rerun old migrations. No customer/payment/Storage policies are changed.
begin;
create table booking_private.site_records (
  key text primary key check (key ~ '^(page|guide|destination):[a-z0-9]+(-[a-z0-9]+)*$|^(settings:site|pricing:catalog|policies:booking)$'),
  revision integer not null check(revision>0), draft jsonb not null,
  published jsonb, active boolean not null default false, published_revision integer,
  updated_at timestamptz not null default now(), updated_by uuid not null references auth.users(id),
  published_at timestamptz, published_by uuid references auth.users(id),
  check(octet_length(draft::text)<=131072), check(published is null or octet_length(published::text)<=131072)
);
create table booking_private.site_revisions (
  key text not null references booking_private.site_records(key), revision integer not null,
  payload jsonb not null, action text not null check(action in ('save','publish','withdraw','restore')),
  actor_id uuid not null references auth.users(id), source_revision integer, created_at timestamptz not null default now(),
  primary key(key,revision)
);
alter table booking_private.site_records enable row level security;
alter table booking_private.site_revisions enable row level security;
revoke all on booking_private.site_records,booking_private.site_revisions from public,anon,authenticated;

create function booking_private.site_validate_tree(p jsonb) returns void
language plpgsql set search_path='' as $$
declare k text; v jsonb; s text;
begin
 if jsonb_typeof(p)='object' then
  if (select count(*) from jsonb_object_keys(p))>30 then raise exception 'Invalid content'; end if;
  for k,v in select * from jsonb_each(p) loop
   if k not in ('slug','title','description','intro','reviewed','sections','related','faqs','draft','overview','presentation','feature','label','points','action','heading','paragraphs','items','links','cards','layout','text','link','href','question','answer','excerpt','published','sources','relatedGuideSlugs','author','editor','country','guideSlugs','url','supportEmail','whatsapp','days','opens','closes','minMinutes','maxMinutes','heroTitle','heroHighlight','heroIntro','homeMetaTitle','homeMetaDescription','standardFlightMinor','multiCityMinor','hotelMinor','comboDiscountMinor','flightText','reservationText') then raise exception 'Unknown field'; end if;
   if k='href' and (jsonb_typeof(v)<>'string' or (v#>>'{}') !~ '^/([a-zA-Z0-9/?#=&%._-]*)$' or (v#>>'{}') like '//%') then raise exception 'Unsafe link'; end if;
   if k='url' and (jsonb_typeof(v)<>'string' or (v#>>'{}') !~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$') then raise exception 'Unsafe source'; end if;
   perform booking_private.site_validate_tree(v);
  end loop;
 elsif jsonb_typeof(p)='array' then
  if jsonb_array_length(p)>60 then raise exception 'Too many entries'; end if;
  for v in select value from jsonb_array_elements(p) loop perform booking_private.site_validate_tree(v); end loop;
 elsif jsonb_typeof(p)='string' then
  s:=p#>>'{}';
  if length(s)>8000 or s ~ '[\x00-\x08\x0b\x0c\x0e-\x1f]' then raise exception 'Invalid text'; end if;
 elsif jsonb_typeof(p) not in ('boolean','number') then raise exception 'Invalid field';
 end if;
end $$;

create function booking_private.site_validate_payload(p_key text,p jsonb) returns void
language plpgsql set search_path='' as $$
declare k text; item jsonb; n numeric; allowed text[];
begin
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>131072 then raise exception 'Invalid content'; end if;
 perform booking_private.site_validate_tree(p);
 if p_key='pricing:catalog' then
  allowed:=array['standardFlightMinor','multiCityMinor','hotelMinor','comboDiscountMinor'];
  foreach k in array allowed loop
   if jsonb_typeof(p->k) is distinct from 'number' or (p->>k) !~ '^[0-9]+$' then raise exception 'Invalid price'; end if;
   n:=(p->>k)::numeric;
   if n>10000000 or n<0 or (k<>'comboDiscountMinor' and n<1) then raise exception 'Invalid price'; end if;
  end loop;
  if (p->>'comboDiscountMinor')::integer>=least((p->>'standardFlightMinor')::integer,(p->>'multiCityMinor')::integer)+(p->>'hotelMinor')::integer then raise exception 'Invalid combo'; end if;
 elsif p_key='policies:booking' then
  allowed:=array['flightText','reservationText'];
  foreach k in array allowed loop if jsonb_typeof(p->k) is distinct from 'string' or length(trim(p->>k))=0 then raise exception 'Missing policy'; end if; end loop;
 elsif p_key='settings:site' then
  allowed:=array['supportEmail','whatsapp','days','opens','closes','minMinutes','maxMinutes','heroTitle','heroHighlight','heroIntro','homeMetaTitle','homeMetaDescription'];
  foreach k in array array['supportEmail','whatsapp','days','opens','closes','heroTitle','heroHighlight','heroIntro','homeMetaTitle','homeMetaDescription'] loop
   if jsonb_typeof(p->k) is distinct from 'string' or length(p->>k)>1000 then raise exception 'Invalid setting'; end if;
  end loop;
  if length(p->>'days') not between 1 and 80 or length(p->>'heroTitle')=0 or length(p->>'heroHighlight')=0 or length(p->>'heroIntro')=0 or length(p->>'homeMetaTitle') not between 1 and 160 or length(p->>'homeMetaDescription') not between 1 and 320
    or (p->>'supportEmail'<>'' and (p->>'supportEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p->>'supportEmail')>254))
    or (p->>'whatsapp'<>'' and p->>'whatsapp' !~ '^\+[1-9][0-9]{6,14}$')
    or p->>'opens' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p->>'closes' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p->>'opens'>=p->>'closes' then raise exception 'Invalid setting'; end if;
  foreach k in array array['minMinutes','maxMinutes'] loop
   if jsonb_typeof(p->k) is distinct from 'number' or (p->>k) !~ '^[0-9]+$' or (p->>k)::numeric not between 5 and 1440 then raise exception 'Invalid target'; end if;
  end loop;
  if (p->>'maxMinutes')::integer<(p->>'minMinutes')::integer then raise exception 'Invalid target'; end if;
 else
  allowed:=array['slug','title','description','intro','reviewed','sections','related','faqs','draft','overview','presentation','feature','excerpt','published','sources','relatedGuideSlugs','author','editor','country','guideSlugs'];
  if split_part(p_key,':',1) not in ('page','guide','destination') or split_part(p_key,':',2) is distinct from p->>'slug' then raise exception 'Invalid content key'; end if;
  if p_key like 'page:%' and split_part(p_key,':',2) not in ('about','dummy-ticket','pricing','how-it-works','sample-dummy-ticket','faq','contact','terms','privacy','refunds','destinations','guides') then raise exception 'Unknown fixed page'; end if;
  foreach k in array array['title','description','intro','slug','reviewed'] loop if jsonb_typeof(p->k) is distinct from 'string' or length(trim(p->>k))=0 then raise exception 'Missing content'; end if; end loop;
  perform booking_private.valid_date(p->>'reviewed');
  if jsonb_typeof(p->'sections') is distinct from 'array' or jsonb_typeof(p->'related') is distinct from 'array' then raise exception 'Missing sections'; end if;
  if jsonb_array_length(p->'sections') not between 1 and 30 then raise exception 'Invalid sections'; end if;
  for item in select value from jsonb_array_elements(p->'sections') loop
   if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'heading') is distinct from 'string' or length(trim(item->>'heading'))=0 or jsonb_typeof(item->'paragraphs') is distinct from 'array' then raise exception 'Invalid section'; end if;
  end loop;
  if p_key like 'guide:%' then
   if jsonb_typeof(p->'excerpt') is distinct from 'string' or jsonb_typeof(p->'sources') is distinct from 'array' or jsonb_typeof(p->'relatedGuideSlugs') is distinct from 'array' then raise exception 'Invalid guide'; end if;
   perform booking_private.valid_date(p->>'published');
  elsif p_key like 'destination:%' then
   if jsonb_typeof(p->'country') is distinct from 'string' or jsonb_typeof(p->'sources') is distinct from 'array' or jsonb_typeof(p->'guideSlugs') is distinct from 'array' then raise exception 'Invalid destination'; end if;
   if jsonb_array_length(p->'sources')<1 then raise exception 'Official source required'; end if;
  end if;
 end if;
 if p - allowed <> '{}'::jsonb then raise exception 'Unknown field'; end if;
end $$;

create function public.admin_site_record(p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform booking_private.require_staff();
 select to_jsonb(r)-'updated_by'-'published_by' into result from booking_private.site_records r where key=p_key;
 return jsonb_build_object('record',result,'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.revision desc) from (select * from booking_private.site_revisions where key=p_key order by revision desc limit 30) h),'[]'::jsonb));
end $$;
create function public.admin_site_list() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform booking_private.require_staff();
 return coalesce((select jsonb_agg(jsonb_build_object('key',key,'title',coalesce(draft->>'title',key),'revision',revision,'published_revision',published_revision,'active',active,'updated_at',updated_at,'published_at',published_at) order by updated_at desc) from booking_private.site_records),'[]'::jsonb);
end $$;
create function public.admin_site_mutate(p_key text,p_revision integer,p_action text,p_payload jsonb default null,p_source_revision integer default null,p_confirmed boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r booking_private.site_records; next_payload jsonb; next_revision integer;
begin
 perform booking_private.require_staff();
 if p_key is null or length(p_key)>100 or p_key !~ '^(page|guide|destination):[a-z0-9]+(-[a-z0-9]+)*$|^(settings:site|pricing:catalog|policies:booking)$' or p_revision is null or p_revision<0 or p_action is null or p_action not in ('save','publish','withdraw','restore') then raise exception 'Invalid action'; end if;
 -- Transaction-scoped lock also serializes the first insert, preventing lost drafts.
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select * into r from booking_private.site_records where key=p_key for update;
 if coalesce(r.revision,0)<>p_revision then raise exception using errcode='40001',message='Revision conflict'; end if;
 if r.key is null and (p_action<>'save' or (select count(*) from booking_private.site_records)>=200) then raise exception 'Save a draft first'; end if;
 next_revision:=p_revision+1;
 if p_action='save' then next_payload:=p_payload;
 elsif p_action='restore' then
  select payload into next_payload from booking_private.site_revisions where key=p_key and revision=p_source_revision;
  if not found then raise exception 'Revision unavailable'; end if;
 else next_payload:=r.draft; end if;
 perform booking_private.site_validate_payload(p_key,next_payload);
 if p_action in ('publish','withdraw') and p_confirmed is distinct from true then raise exception 'Review confirmation required'; end if;
 if p_action='withdraw' and p_key not like 'guide:%' and p_key not like 'destination:%' then raise exception 'Core settings/pages cannot be withdrawn'; end if;
 if p_action='publish' then
  if p_key ~ '^(page|guide|destination):' and ((next_payload->>'reviewed')::date>(now() at time zone 'Asia/Kolkata')::date or (p_key like 'guide:%' and (next_payload->>'published')::date>(now() at time zone 'Asia/Kolkata')::date)) then raise exception 'Future editorial date'; end if;
  if p_key='pricing:catalog' then
   update booking_private.catalog set one_way_minor=(next_payload->>'standardFlightMinor')::integer,return_minor=(next_payload->>'standardFlightMinor')::integer,multi_city_minor=(next_payload->>'multiCityMinor')::integer where singleton;
   update booking_private.reservation_catalog set hotel_minor=(next_payload->>'hotelMinor')::integer,combo_discount_minor=(next_payload->>'comboDiscountMinor')::integer where singleton;
  elsif p_key='policies:booking' then
   update booking_private.catalog set policy_version='managed-flight-'||next_revision,policy_text=next_payload->>'flightText' where singleton;
   update booking_private.reservation_catalog set policy_version='managed-reservations-'||next_revision,policy_text=next_payload->>'reservationText' where singleton;
  end if;
 end if;
 if r.key is null then
  insert into booking_private.site_records(key,revision,draft,updated_by) values(p_key,next_revision,next_payload,auth.uid());
 else
  update booking_private.site_records set revision=next_revision,draft=next_payload,updated_at=now(),updated_by=auth.uid(),
   published=case when p_action='publish' then next_payload else published end,
   active=case when p_action='publish' then true when p_action='withdraw' then false else active end,
   published_revision=case when p_action='publish' then next_revision else published_revision end,
   published_at=case when p_action='publish' then now() else published_at end,
   published_by=case when p_action='publish' then auth.uid() else published_by end where key=p_key;
 end if;
 insert into booking_private.site_revisions(key,revision,payload,action,actor_id,source_revision) values(p_key,next_revision,next_payload,p_action,auth.uid(),case when p_action='restore' then p_source_revision else null end);
 return public.admin_site_record(p_key);
end $$;

create function public.public_booking_catalog() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('pricing',jsonb_build_object('standardFlightMinor',c.one_way_minor,'multiCityMinor',c.multi_city_minor,'hotelMinor',h.hotel_minor,'comboDiscountMinor',h.combo_discount_minor),
  'policies',jsonb_build_object('flight',jsonb_build_object('version',c.policy_version,'text',c.policy_text),'reservation',jsonb_build_object('version',h.policy_version,'text',h.policy_text)))
 from booking_private.catalog c cross join booking_private.reservation_catalog h where c.singleton and h.singleton;
$$;
create function public.public_site_snapshot() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'preferences',(select published from booking_private.site_records where key='settings:site' and active),
  'pricing',jsonb_build_object('standardFlightMinor',c.one_way_minor,'multiCityMinor',c.multi_city_minor,'hotelMinor',h.hotel_minor,'comboDiscountMinor',h.combo_discount_minor),
  'policies',jsonb_build_object('flight',jsonb_build_object('version',c.policy_version,'text',c.policy_text),'reservation',jsonb_build_object('version',h.policy_version,'text',h.policy_text)),
  'records',coalesce((select jsonb_agg(jsonb_build_object('key',key,'active',active,'payload',case when active then published else null end)) from booking_private.site_records where key ~ '^(page|guide|destination):' and published_revision is not null),'[]'::jsonb))
 from booking_private.catalog c cross join booking_private.reservation_catalog h where c.singleton and h.singleton;
$$;
-- A pre-stream public route check exposes neither draft content nor draft existence.
create function public.public_site_route_status(p_key text) returns text
language sql stable security definer set search_path='' as $$
 select coalesce((select case when active then 'published' else 'withdrawn' end from booking_private.site_records where key=p_key and key ~ '^(guide|destination):' and published_revision is not null),'default');
$$;

create function public.admin_customer_directory(p_page integer default 1,p_query text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; term text:=trim(coalesce(p_query,''));
begin
 perform booking_private.require_staff();
 if p_page is null or p_page not between 1 and 10000 or length(term)>100 or term ~ '[\x00-\x1f]' then raise exception 'Invalid filter'; end if;
 with customers as (select owner_id,max(account_email) email,count(*)::integer orders,count(*) filter(where payment_status='awaiting_payment')::integer awaiting,count(*) filter(where payment_status='paid')::integer paid,max(created_at) last_order from public.orders where term='' or position(lower(term) in lower(account_email))>0 group by owner_id),
 page as (select * from customers order by last_order desc,owner_id limit 20 offset (p_page-1)*20)
 select jsonb_build_object('total',(select count(*) from customers),'customers',coalesce((select jsonb_agg(to_jsonb(p) order by p.last_order desc,p.owner_id) from page p),'[]'::jsonb)) into result;
 return result;
end $$;

revoke all on function booking_private.site_validate_tree(jsonb),booking_private.site_validate_payload(text,jsonb) from public,anon,authenticated;
revoke all on function public.admin_site_record(text),public.admin_site_list(),public.admin_site_mutate(text,integer,text,jsonb,integer,boolean),public.admin_customer_directory(integer,text),public.public_site_snapshot(),public.public_booking_catalog(),public.public_site_route_status(text) from public,anon,authenticated;
grant usage on schema public to anon,authenticated;
grant execute on function public.admin_site_record(text),public.admin_site_list(),public.admin_site_mutate(text,integer,text,jsonb,integer,boolean),public.admin_customer_directory(integer,text) to authenticated;
grant execute on function public.public_site_snapshot(),public.public_booking_catalog(),public.public_site_route_status(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
