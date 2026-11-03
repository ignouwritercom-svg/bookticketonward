// ISOLATED PostgreSQL + synthetic Auth/Storage metadata. Never loads .env or contacts Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { validatePdf, MAX_PDF_BYTES } from "../src/lib/documents.ts";
import { business, getReservationQuote, reservationPolicy } from "../src/config/business.ts";

const db = await PGlite.create();
let checks = 0;
const check = (condition, description) => { assert.ok(condition, description); checks++; };
const denied = async (fn, description) => { await assert.rejects(fn, undefined, description); checks++; };
const owner = randomUUID(), other = randomUUID(), staff = randomUUID();
const identity = async id => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
  await db.exec(`set role ${id ? "authenticated" : "anon"}`);
};
const action = async (order, action, document = null, note = null, size = null, kind = "flight") =>
  (await db.query("select public.admin_order_action($1,$2,$3,$4,$5,$6) as result", [order,action,document,note,size,kind])).rows[0].result;
const download = async id => (await db.query("select public.authorized_order_document($1) as result",[id])).rows[0].result;
try {
  await db.exec(`
    create role anon; create role authenticated; create role migration_owner nosuperuser nobypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,migration_owner;
    grant select,references on auth.users to migration_owner;
    grant create,usage on schema public to migration_owner;
    create schema storage authorization migration_owner;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.buckets owner to migration_owner; alter table storage.objects owner to migration_owner;
    alter table storage.buckets enable row level security; alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant all on storage.buckets,storage.objects to anon,authenticated;
    create policy broad_test_objects on storage.objects for all to anon,authenticated using(true) with check(true);
    create policy broad_test_buckets on storage.buckets for all to anon,authenticated using(true) with check(true);
    alter default privileges for role migration_owner grant all on tables to public,anon,authenticated;
    alter default privileges for role migration_owner grant execute on functions to public,anon,authenticated;
  `);
  await db.exec((await db.query("select format('grant create on database %I to migration_owner',current_database()) as sql")).rows[0].sql);
  for(const [id,email] of [[owner,"owner@example.test"],[other,"other@example.test"],[staff,"staff@example.test"]])
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",[id,email]);
  await db.exec("set role migration_owner");
  for(const name of ["202610220001_customer_bookings.sql","202610220002_admin_documents.sql","202611020001_hotel_reservations.sql"])
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),"utf8"));
  checks++;
  await db.exec("reset role");
  check((await db.query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='order-documents'")).rows.every(r=>!r.public && Number(r.file_size_limit)===MAX_PDF_BYTES && r.allowed_mime_types[0]==="application/pdf"),"Private bucket size/MIME limits");
  check((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relname in ('staff_roles','order_documents','order_staff_notes','order_audit','orders','booking_drafts','order_contacts','order_passengers','order_sectors','catalog') and c.relrowsecurity and n.nspname in ('public','booking_private')")).rows[0].n===10,"All existing and new data tables retain RLS");
  const booking = email => ({
    trip:{type:"return",sectors:[{from:"Delhi",to:"Dubai",departure:"2099-06-15"}],returnDate:"2099-06-20"},
    passengers:[{givenNames:"Isolated",surname:"Fixture",singleName:false,dob:"1990-01-01",sex:"F",nationality:""}],
    communication:{accountEmail:email,channel:"whatsapp",whatsapp:"+919876543210",alternateContact:"",purpose:"",appointmentDate:"",specialInstructions:"ISOLATED FIXTURE ONLY"},
    confirmations:{detailsCorrect:true,termsAccepted:true}
  });
  const catalog = (await db.query("select * from booking_private.catalog")).rows[0];
  async function createOrder(id,email) {
    await identity(id);
    const draft = randomUUID();
    await db.query("select public.save_booking_draft($1,0,$2::jsonb)",[draft,JSON.stringify(booking(email))]);
    return (await db.query("select public.create_booking_order($1,1,$2,69900,$3,$4) as id",[draft,randomUUID(),catalog.policy_version,catalog.policy_text])).rows[0].id;
  }
  const paid = await createOrder(owner,"owner@example.test");
  const unpaid = await createOrder(other,"other@example.test");
  await db.exec("reset role");
  // ONLY this in-memory fixture is marked paid by the test owner. No runtime bypass.
  await db.query("update public.orders set payment_status='paid' where id=$1",[paid]);
  await db.query("insert into booking_private.staff_roles(user_id) values($1)",[staff]);
  for(const id of [null,owner,other]) {
    await identity(id);
    await denied(()=>action(paid,"start"),"Non-staff action denied");
    await denied(()=>db.query("insert into booking_private.staff_roles(user_id) values($1)",[id||other]),"Cannot self-promote");
    await denied(()=>db.query("update public.orders set payment_status='paid' where id=$1",[unpaid]),"No direct payment mutation");
    await denied(()=>db.query("insert into storage.objects(bucket_id,name) values('order-documents','bad.pdf')"),"Direct object upload denied despite broad permissive policy");
    check((await db.query("select * from storage.buckets where id='order-documents'")).rows.length===0,"Private bucket inaccessible to clients");
    if(id) {
      check((await db.query("select public.is_booking_staff() as allowed")).rows[0].allowed===false,"Customer not staff");
      check((await db.query("select * from public.order_staff_notes")).rows.length===0,"Customer sees no notes");
      check((await db.query("select * from public.order_audit")).rows.length===0,"Customer sees no audit");
    }
  }
  await identity(staff);
  check((await db.query("select public.is_booking_staff() as allowed")).rows[0].allowed,"Verified staff recognized");
  check((await db.query("select * from public.orders")).rows.length===2,"Staff sees both customers' orders");
  check((await db.query("select * from public.order_passengers")).rows.length===2,"Staff reads passengers under RLS");
  await denied(()=>db.query("update booking_private.staff_roles set revoked_at=null"),"Staff cannot manage roles");
  await denied(()=>action(unpaid,"start"),"Unpaid processing denied");
  await denied(()=>action(unpaid,"reserve",null,null,20),"Unpaid upload denied");
  await denied(()=>action(paid,"reserve",null,null,20),"Must start processing first");
  await action(paid,"note",null,"PRIVATE TEST NOTE");
  await action(paid,"start");
  const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
  const first = await action(paid,"reserve",null,null,pdf.length);
  check(first.version===1 && first.object_name===`${paid}/${first.id}.pdf`,"First safe object key and version");
  await denied(()=>action(paid,"complete",first.id),"Missing storage object cannot finalize");
  await denied(()=>action(paid,"publish",first.id),"Pending version cannot publish");
  await denied(()=>action(paid,"reserve",null,null,MAX_PDF_BYTES+1),"Database caps size");
  await denied(()=>db.query("insert into storage.objects(bucket_id,name) values('order-documents','bad.pdf')"),"Staff also cannot bypass server PDF validation via direct Storage");
  await db.exec("reset role");
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('order-documents',$1,$2::jsonb)",[first.object_name,JSON.stringify({size:pdf.length,mimetype:"application/pdf"})]);
  await identity(staff);
  await action(paid,"complete",first.id);
  check((await db.query("select fulfilment_status from public.orders where id=$1",[paid])).rows[0].fulfilment_status==="documents_ready","Upload means ready, not delivered");
  const eventsBefore=(await db.query("select count(*)::int n from public.order_audit")).rows[0].n;
  await action(paid,"complete",first.id);
  check((await db.query("select count(*)::int n from public.order_audit")).rows[0].n===eventsBefore,"Finalization retry idempotent");
  await identity(owner);
  await denied(()=>download(first.id),"Owner cannot download unpublished PDF");
  check((await db.query("select * from public.order_documents")).rows.length===0,"Unpublished metadata hidden");
  check((await db.query("select * from public.order_staff_notes")).rows.length===0,"Actual note hidden from owner");
  await denied(()=>db.query("insert into public.order_staff_notes(order_id,actor_id,body) values($1,$2,'bad')",[paid,owner]),"Customer cannot add notes");
  await denied(()=>db.query("delete from public.order_audit"),"Customer cannot modify audit");
  await identity(staff);
  await action(paid,"publish",first.id);
  check((await db.query("select fulfilment_status from public.orders where id=$1",[paid])).rows[0].fulfilment_status==="documents_ready","Publication does not mark delivered");
  await action(paid,"deliver_whatsapp",first.id);
  check((await db.query("select fulfilment_status from public.orders where id=$1",[paid])).rows[0].fulfilment_status==="delivered","Explicit manual delivery changes status");
  check((await db.query("select event,actor_id,created_at from public.order_audit where event in ('document_published','delivered_whatsapp')")).rows.every(r=>r.actor_id===staff && r.created_at),"Separate publication/delivery events identify staff/time");
  await identity(owner);
  check((await download(first.id)).id===first.id,"Owner authorized for published paid PDF");
  check((await db.query("select * from public.order_documents")).rows.length===1,"Owner sees published metadata");
  check((await db.query("select * from storage.objects where bucket_id='order-documents'")).rows.length===0,"Even owner must use authenticated download endpoint");
  await identity(other);
  await denied(()=>download(first.id),"Cross-customer download denied");
  check((await db.query("select * from public.order_documents")).rows.length===0,"Cross-customer metadata denied");
  await identity(null);
  await denied(()=>download(first.id),"Unauthenticated download denied");
  await identity(staff);
  const second=await action(paid,"reserve",null,null,pdf.length);
  check(second.version===2 && second.object_name!==first.object_name,"New version never overwrites old bytes");
  await denied(()=>action(unpaid,"publish",first.id),"Unpaid publication denied");
  await action(paid,"abort",second.id);
  await denied(()=>action(paid,"complete",second.id),"Aborted upload cannot finalize");
  const third=await action(paid,"reserve",null,null,pdf.length);
  check(third.version===3,"Failed versions retained; numbering not reused");
  await action(paid,"withdraw",first.id);
  await identity(owner);
  await denied(()=>download(first.id),"Withdrawn PDF denied immediately");
  check((await db.query("select * from public.order_documents")).rows.length===0,"Withdrawn metadata hidden");
  await db.exec("reset role");
  await db.query("update booking_private.staff_roles set revoked_at=now() where user_id=$1",[staff]);
  await identity(staff);
  check(!(await db.query("select public.is_booking_staff() as allowed")).rows[0].allowed,"Revocation applies without new token/login");
  check((await db.query("select * from public.orders")).rows.length===0,"Revoked staff loses other customer reads");
  await denied(()=>action(paid,"note",null,"Revoked"),"Revoked mutation denied");
  await denied(()=>download(first.id),"Revoked preview denied");
  await db.exec("reset role");
  await db.query("update booking_private.staff_roles set revoked_at=null where user_id=$1",[staff]);
  await db.query("update auth.users set email_confirmed_at=null where id=$1",[staff]);
  await identity(staff);
  check(!(await db.query("select public.is_booking_staff() as allowed")).rows[0].allowed,"Unverified staff denied");
  await denied(()=>action(paid,"start"),"Unverified staff operation denied");
  await db.exec("reset role");
  const acl=(await db.query(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where p.proname in ('is_booking_staff','require_staff','admin_order_action','authorized_order_document') and a.grantee=0`)).rows[0];
  check(acl.n===0,"No PUBLIC execution of staff/document functions");
  check((await db.query("select count(*)::int n from pg_proc where proname in ('is_booking_staff','require_staff','admin_order_action','authorized_order_document') and prosecdef and proconfig @> array['search_path=\"\"']")).rows[0].n===4,"All definer functions pin empty search_path");
  validatePdf(pdf,"test.pdf","application/pdf"); checks++;
  for(const [bytes,name,mime] of [[pdf,"test.exe","application/pdf"],[pdf,"test.pdf","text/plain"],[new Uint8Array(),"test.pdf","application/pdf"],[new Uint8Array(MAX_PDF_BYTES+1),"test.pdf","application/pdf"],[new TextEncoder().encode("fake PDF"),"test.pdf","application/pdf"],[pdf,"../test.pdf","application/pdf"],[pdf.slice(0,15),"test.pdf","application/pdf"]]) {
    assert.throws(()=>validatePdf(bytes,name,mime)); checks++;
  }
  const hotelCatalog=(await db.query("select * from booking_private.reservation_catalog")).rows[0];
  check(hotelCatalog.hotel_minor===business.hotelPriceMinor && hotelCatalog.combo_discount_minor===business.comboDiscountMinor && hotelCatalog.policy_text===reservationPolicy.text && hotelCatalog.policy_version===reservationPolicy.version,"Hotel prices/policy match application exactly");
  await db.query("update auth.users set email_confirmed_at=now() where id=$1",[staff]);
  const stay={city:"Paris",country:"France",checkIn:"2099-06-16",checkOut:"2099-06-20",rooms:1,preference:"Near public transport"};
  const hotelBooking={...booking("owner@example.test"),service:"hotel",trip:{type:"one-way",sectors:[],returnDate:""},hotels:[stay]};
  const comboBooking={...booking("owner@example.test"),service:"combo",hotels:[stay]};
  const createReservation=async data=>{
    await identity(owner);
    const draft=randomUUID();
    await db.query("select public.save_booking_draft($1,0,$2::jsonb)",[draft,JSON.stringify(data)]);
    const quote=getReservationQuote(data.trip.type,data.passengers.length,data.service,data.hotels.length);
    const id=(await db.query("select public.create_booking_order($1,1,$2,$3,$4,$5) id",[draft,randomUUID(),quote.pricePerPassengerMinor,reservationPolicy.version,reservationPolicy.text])).rows[0].id;
    return {id,draft,quote};
  };
  const hotelOrder=await createReservation(hotelBooking);
  check(hotelOrder.quote.totalMinor===69900,"Approved standalone hotel price");
  check((await db.query("select * from public.order_sectors where order_id=$1",[hotelOrder.id])).rows.length===0,"Hotel-only order has no invented flight sectors");
  const hotelRow=(await db.query("select * from public.orders where id=$1",[hotelOrder.id])).rows[0];
  check(hotelRow.trip_type===null && hotelRow.service_type==="hotel" && hotelRow.payment_status==="awaiting_payment","Hotel order typed and unpaid");
  check((await db.query("select * from public.order_hotels where order_id=$1",[hotelOrder.id])).rows.length===1,"Typed stay saved transactionally");
  await denied(()=>db.query("update public.order_hotels set city='Changed' where order_id=$1",[hotelOrder.id]),"Owner cannot mutate hotel snapshot");
  const comboOrder=await createReservation(comboBooking);
  check(comboOrder.quote.totalMinor===119900,"Approved return + one hotel combo price");
  check(getReservationQuote("multi-city",1,"combo",1).totalMinor===149900,"Approved multi-city combo price");
  check(getReservationQuote("return",2,"combo",2).totalMinor===379600,"Additional stay/guest pricing remains integer and discount applies once per guest");
  for(const mutate of [
    data=>{data.hotels[0].checkOut=data.hotels[0].checkIn;},
    data=>{data.hotels[0].checkIn="2020-01-01";},
    data=>{data.hotels[0].checkOut="2099-08-20";},
    data=>{data.hotels[0].rooms=2;},
    data=>{data.hotels[0].country="";},
    data=>{data.hotels.push({...stay});},
    data=>{data.hotels=[];},
    data=>{data.trip=booking("owner@example.test").trip;},
    data=>{data.service="forged";},
  ]) {
    const invalid=structuredClone(hotelBooking); mutate(invalid);
    await denied(()=>db.query("select public.save_booking_draft($1,0,$2::jsonb)",[randomUUID(),JSON.stringify(invalid)]),"Invalid hotel data rejected by direct RPC");
  }
  const priceDraft=randomUUID();
  await db.query("select public.save_booking_draft($1,0,$2::jsonb)",[priceDraft,JSON.stringify(comboBooking)]);
  await denied(()=>db.query("select public.create_booking_order($1,1,$2,1,$3,$4)",[priceDraft,randomUUID(),reservationPolicy.version,reservationPolicy.text]),"Forged combo price fails closed");
  await identity(other);
  check((await db.query("select * from public.order_hotels")).rows.length===0,"Other customer cannot read hotel details");
  await identity(staff);
  check((await db.query("select * from public.order_hotels")).rows.length===2,"Staff reads hotel snapshots");
  await denied(()=>action(comboOrder.id,"start"),"Unpaid combo fulfilment blocked");
  await db.exec("reset role");
  await db.query("update public.orders set payment_status='paid' where id=$1",[comboOrder.id]);
  await identity(staff);
  await action(comboOrder.id,"start");
  async function uploadFixture(kind) {
    const document=await action(comboOrder.id,"reserve",null,null,pdf.length,kind);
    await db.exec("reset role");
    await db.query("insert into storage.objects(bucket_id,name,metadata) values('order-documents',$1,$2::jsonb)",[document.object_name,JSON.stringify({size:pdf.length,mimetype:"application/pdf"})]);
    await identity(staff);
    await action(comboOrder.id,"complete",document.id);
    return document;
  }
  const flightDoc=await uploadFixture("flight");
  check((await db.query("select fulfilment_status from public.orders where id=$1",[comboOrder.id])).rows[0].fulfilment_status==="processing","Combo not ready with only flight PDF");
  await action(comboOrder.id,"publish",flightDoc.id);
  await denied(()=>action(comboOrder.id,"deliver_email",flightDoc.id),"Cannot deliver incomplete combo");
  const hotelDoc=await uploadFixture("hotel");
  check((await db.query("select fulfilment_status from public.orders where id=$1",[comboOrder.id])).rows[0].fulfilment_status==="documents_ready","Both document types make combo ready");
  await denied(()=>action(comboOrder.id,"deliver_email",flightDoc.id),"Both types must be published before delivery");
  await action(comboOrder.id,"publish",hotelDoc.id);
  await identity(owner);
  check((await download(hotelDoc.id)).id===hotelDoc.id,"Owner can access published hotel PDF");
  await identity(staff);
  await action(comboOrder.id,"withdraw",hotelDoc.id);
  check((await db.query("select fulfilment_status from public.orders where id=$1",[comboOrder.id])).rows[0].fulfilment_status==="processing","Withdrawing required hotel reopens processing");
  const combined=await uploadFixture("combined");
  await action(comboOrder.id,"publish",combined.id);
  await action(comboOrder.id,"deliver_email",combined.id);
  check((await db.query("select fulfilment_status from public.orders where id=$1",[comboOrder.id])).rows[0].fulfilment_status==="delivered","Combined PDF satisfies both requirements");
  await denied(()=>action(paid,"reserve",null,null,pdf.length,"hotel"),"Wrong document type blocked for flight order");
  console.log(`PASS: ${checks} isolated admin/document/hotel assertions. Synthetic Auth/Storage metadata; no live Supabase or payments.`);
} finally { await db.close(); }
