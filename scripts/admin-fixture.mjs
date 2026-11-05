// LOCAL INTEGRATION BRIDGE: actual migrated PostgreSQL + synthetic Auth/Storage.
// This is not Supabase/PostgREST conformance testing and never loads .env.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { installManagementDatabase } from "./management-database.mjs";
import { fixtureOwner, fixtureOther, fixtureUser, fixtureCookie, identity } from "./workspace-fixture.mjs";
export const adminFixtureSecret = "sb_secret_LOCAL_SYNTHETIC_ADMIN_STORAGE_ONLY";
export const adminFixtureKey = "sb_publishable_LOCAL_SYNTHETIC_ADMIN_ONLY";
export const fixturePdf = Buffer.from("%PDF-1.4\n% SYNTHETIC LOCAL ADMIN TEST ONLY\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
const rpcArguments = { is_booking_staff: [], public_site_snapshot: [], public_booking_catalog: [], public_site_route_status: ["p_key"], admin_site_list: [], admin_site_record: ["p_key"], admin_site_mutate: ["p_key", "p_revision", "p_action", "p_payload", "p_source_revision", "p_confirmed"], admin_customer_directory: ["p_page", "p_query"], admin_order_action: ["p_order_id", "p_action", "p_document_id", "p_note", "p_size", "p_kind"], authorized_order_document: ["p_id"], admin_notification_log: ["p_page", "p_failed"], retry_order_notification: ["p_id", "p_request", "p_acknowledge_duplicate"], read_order_notification: ["p_id"], save_booking_draft: ["p_id", "p_revision", "p_data"], create_booking_order: ["p_draft_id", "p_revision", "p_idempotency_key", "p_unit_price_minor", "p_policy_version", "p_policy_text"] };
export async function startAdminFixture(port = 3211) {
  const db = await PGlite.create(); await installManagementDatabase(db); await db.exec("reset role");
  const sql = async (text, values = []) => (await db.query(text, values)).rows;
  const as = async id => { await db.exec("reset role"); await sql("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]); await db.exec(`set role ${id ? "authenticated" : "anon"}`); };
  for (const owner of [fixtureOwner, fixtureOther]) await sql("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [owner, fixtureUser(owner).email]);
  await sql("insert into booking_private.staff_roles(user_id) values($1)", [fixtureOwner]);
  const created = [];
  const policy = (await sql("select policy_version,policy_text from booking_private.catalog"))[0];
  const reservationPolicy = (await sql("select policy_version,policy_text from booking_private.reservation_catalog"))[0];
  for (let index = 0; index < 23; index++) {
    const service = ["flight", "hotel", "combo"][index % 3], id = randomUUID();
    const booking = { service, trip: { type: "one-way", sectors: service === "hotel" ? [] : [{ from: "New Delhi (DEL)", to: "Paris (CDG)", departure: "2099-06-15" }], returnDate: "" }, hotels: service === "flight" ? [] : [{ city: "Paris", country: "France", checkIn: "2099-06-16", checkOut: "2099-06-20", rooms: 1, preference: "" }], passengers: [{ givenNames: "Synthetic", surname: "Admin Fixture", singleName: false, dob: "1990-01-01", sex: "F", nationality: "" }], communication: { accountEmail: fixtureUser(fixtureOther).email, channel: "email", whatsapp: "", alternateContact: "", purpose: "", appointmentDate: "", specialInstructions: "SYNTHETIC ISOLATED ADMIN FIXTURE ONLY" }, confirmations: { detailsCorrect: true, termsAccepted: true } };
    await as(fixtureOther); await sql("select public.save_booking_draft($1,0,$2::jsonb)", [id, JSON.stringify(booking)]);
    const acceptance = service === "flight" ? policy : reservationPolicy;
    const result = (await sql("select public.create_booking_order($1,1,$2,$3,$4,$5) id", [id, randomUUID(), service === "combo" ? 119900 : 69900, acceptance.policy_version, acceptance.policy_text]))[0];
    created.push({ ...result, service });
    await db.exec("reset role"); await sql("update public.orders set reference=$2,created_at=$3 where id=$1", [result.id, `DT-ADMIN-ONLY-${String(index + 1).padStart(3, "0")}`, new Date(Date.UTC(2026, 9, 31 - index, 10)).toISOString()]);
  }
  // Only this disposable database receives synthetic paid fixtures.
  await sql("update public.orders set payment_status='paid' where id=any($1::uuid[])", [created.slice(0, 5).map(order => order.id)]);
  await as(fixtureOwner);
  await sql("select public.admin_order_action($1,'start')", [created[1].id]);
  await sql("select public.admin_order_action($1,'reserve',null,null,100,'hotel')", [created[1].id]);
  await db.exec("reset role");
  const tables = ["orders", "booking_drafts", "order_documents", "order_staff_notes", "order_audit", "order_notifications"];
  const columns = Object.fromEntries(await Promise.all(tables.map(async table => [table, new Set((await sql("select column_name from information_schema.columns where table_schema='public' and table_name=$1", [table])).map(row => row.column_name))])));
  const blobs = new Map(); let sequence = Promise.resolve(), rejected = 0;
  const server = createServer((request, response) => {
    sequence = sequence.then(async () => {
      const url = new URL(request.url, `http://127.0.0.1:${port}`), owner = identity(request);
      const send = (value, status = 200) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(value)); };
      const chunks = []; for await (const chunk of request) { chunks.push(chunk); if (chunks.reduce((sum, item) => sum + item.length, 0) > 11 * 1024 * 1024) return send({ message: "Fixture body limit" }, 413); }
      const bytes = Buffer.concat(chunks);
      try {
        if (url.pathname === "/auth/v1/user") return owner ? send(fixtureUser(owner)) : send({ message: "Synthetic session required" }, 401);
        if (url.pathname === "/auth/v1/logout") return send({});
        // Synthetic OTP transport exists only in this disposable loopback fixture.
        if (url.pathname === "/auth/v1/otp") {
          const input = JSON.parse(bytes.toString());
          if (input.create_user !== false) return send({ message: "Staff entry must not create users", code: "fixture_registration_denied" }, 400);
          if (![fixtureOwner, fixtureOther].some(id => fixtureUser(id).email === input.email)) return send({ message: "Signups disabled", code: "otp_disabled" }, 400);
          return send({});
        }
        if (url.pathname === "/auth/v1/verify") {
          const input = JSON.parse(bytes.toString());
          const id = [fixtureOwner, fixtureOther].find(id => fixtureUser(id).email === input.email);
          if (!id || input.token !== "123456" || input.type !== "email") return send({ message: "Invalid synthetic OTP", code: "otp_expired" }, 400);
          const session = JSON.parse(Buffer.from(fixtureCookie(id).value.slice(7), "base64url").toString());
          return send(session);
        }
        if (url.pathname === "/__fixture/revoke-staff") { await db.exec("reset role"); await sql("update booking_private.staff_roles set revoked_at=now() where user_id=$1", [fixtureOwner]); return send({ ok: true }); }
        if (url.pathname.startsWith("/storage/v1/object")) {
          if (request.headers.apikey !== adminFixtureSecret) return send({ message: "Private Storage denied" }, 403);
          let path = decodeURIComponent(url.pathname.slice("/storage/v1/object/".length)).replace(/^authenticated\//, "");
          if (!path.startsWith("order-documents")) return send({ message: "Unknown bucket" }, 404);
          await db.exec("reset role");
          if (request.method === "POST") {
            if (blobs.has(path)) return send({ message: "Object already exists" }, 409);
            blobs.set(path, bytes); await sql("insert into storage.objects(bucket_id,name,metadata) values('order-documents',$1,$2::jsonb)", [path.slice("order-documents/".length), JSON.stringify({ size: bytes.length, mimetype: "application/pdf" })]);
            return send({ Key: path, Id: randomUUID() });
          }
          if (request.method === "GET") { const blob = blobs.get(path); if (!blob) return send({ message: "Object missing" }, 404); response.writeHead(200, { "Content-Type": "application/pdf" }); return response.end(blob); }
          if (request.method === "DELETE") { const input = JSON.parse(bytes.toString()); for (const prefix of input.prefixes ?? []) { blobs.delete(`order-documents/${prefix}`); await sql("delete from storage.objects where bucket_id='order-documents' and name=$1", [prefix]); } return send([]); }
          return send({ message: "Unsupported fixture Storage method" }, 405);
        }
        await as(owner);
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const name = url.pathname.split("/").at(-1), args = rpcArguments[name];
          if (!args) { rejected++; return send({ message: "Unsupported fixture RPC" }, 400); }
          const input = bytes.length ? JSON.parse(bytes.toString()) : {};
          const values = args.map(key => ["p_payload", "p_data"].includes(key) && input[key] != null ? JSON.stringify(input[key]) : input[key] ?? (key === "p_kind" ? "flight" : null));
          const result = await sql(`select public.${name}(${args.map((_, index) => `$${index + 1}`).join(",")}) result`, values);
          return send(result[0].result);
        }
        const table = url.pathname.split("/").at(-1);
        if (request.method !== "GET" && request.method !== "HEAD" || !tables.includes(table)) { rejected++; return send({ message: "Unsupported fixture table operation" }, 400); }
        const select = url.searchParams.get("select") ?? "*", join = select.includes("orders!");
        if (join && !["order_documents", "order_audit"].includes(table)) throw new Error("Unsupported fixture relationship");
        const field = key => {
          const alias = key.startsWith("orders.") ? "o" : "t", name = key.replace(/^orders\./, "");
          if (name === "data->>service" && table === "booking_drafts") return "t.data->>'service'";
          if (!(alias === "o" ? columns.orders : columns[table]).has(name)) throw new Error("Unsupported fixture column");
          return `${alias}."${name}"`;
        };
        const values = [], where = [];
        for (const [key, filter] of url.searchParams) {
          if (["select", "order", "offset", "limit"].includes(key)) continue;
          if (key === "or") { if (filter !== "(data->>service.eq.flight,data->>service.is.null)") throw new Error("Unsupported fixture OR"); where.push("(t.data->>'service'='flight' or t.data->>'service' is null)"); continue; }
          const column = field(key), [operator, ...rest] = filter.split("."), expected = rest.join(".");
          if (operator === "is" && expected === "null") where.push(`${column} is null`);
          else if (operator === "not" && expected === "is.null") where.push(`${column} is not null`);
          else if (operator === "in") { const items = expected.replace(/^\(|\)$/g, "").split(","); const bindings = items.map(item => { values.push(item); return `$${values.length}`; }); where.push(`${column} in (${bindings.join(",")})`); }
          else { const operations = { eq: "=", ilike: "ilike", gte: ">=", lte: "<=", gt: ">", lt: "<" }; if (!operations[operator]) throw new Error("Unsupported fixture filter"); values.push(expected); where.push(`${column} ${operations[operator]} $${values.length}`); }
        }
        const from = `public.${table} t${join ? " inner join public.orders o on o.id=t.order_id" : ""}${where.length ? ` where ${where.join(" and ")}` : ""}`;
        const count = Number((await sql(`select count(*) total from ${from}`, values))[0].total);
        response.setHeader("Content-Range", `0-${Math.max(0, count - 1)}/${count}`);
        if (request.method === "HEAD") { response.writeHead(200); return response.end(); }
        const order = (url.searchParams.get("order") ?? "").split(",").filter(Boolean).map(item => { const [column, direction] = item.split("."); return `${field(column)} ${direction === "desc" ? "desc" : "asc"}`; }).join(",");
        const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 1000);
        if (!Number.isInteger(offset) || !Number.isInteger(limit) || offset < 0 || limit > 1000 || limit < 1) throw new Error("Invalid fixture range");
        const joined = join ? ",to_jsonb(o) as orders" : "";
        let rows = await sql(`select t.*${joined} from ${from}${order ? ` order by ${order}` : ""} limit ${limit} offset ${offset}`, values);
        if (select !== "*") {
          const nested = /orders!inner\(([^)]+)\)/.exec(select)?.[1].split(","), selected = select.replace(/,?orders!inner\([^)]+\)/, "").split(",").filter(Boolean);
          rows = rows.map(row => ({ ...Object.fromEntries(selected.map(key => [key, row[key]])), ...(nested ? { orders: Object.fromEntries(nested.map(key => [key, row.orders[key]])) } : {}) }));
        }
        return send(request.headers.accept?.includes("vnd.pgrst.object") ? rows[0] ?? null : rows);
      } catch (error) { return send({ code: error.code ?? "FIXTURE_ERROR", message: error.code ? "Isolated PostgreSQL denied the operation" : error.message }, error.code === "42501" ? 403 : 400); }
    }).catch(() => { if (!response.headersSent) response.writeHead(500); response.end(); });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return { url: `http://127.0.0.1:${port}`, key: adminFixtureKey, secret: adminFixtureSecret, orders: created, rejected: () => rejected, close: async () => { await new Promise(resolve => server.close(resolve)); await sequence; await db.close(); } };
}
