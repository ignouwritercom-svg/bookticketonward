// LOOPBACK-ONLY synthetic Auth/PostgREST adapter for browser testing.
// This does not load .env, use real credentials or connect to Supabase/Storage.
import { createServer } from "node:http";
import { createHmac } from "node:crypto";

export const fixtureOwner = "11111111-1111-4111-8111-111111111111";
export const fixtureOther = "22222222-2222-4222-8222-222222222222";
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const secret = "LOCAL-SYNTHETIC-TEST-ONLY-NEVER-A-PRODUCTION-KEY";
const key = "sb_publishable_local_synthetic_workspace_fixture_only";
export const fixtureUser = owner => ({ id: owner, email: owner === fixtureOwner ? "workspace-owner@example.test" : "workspace-other@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, aud: "authenticated", role: "authenticated" });
export function fixtureCookie(owner = fixtureOwner) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner, aud: "authenticated", exp, email: fixtureUser(owner).email })).toString("base64url")}`;
  const access_token = `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  return { name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify({ access_token, refresh_token: "synthetic-refresh-unused", expires_at: exp, expires_in: 3600, token_type: "bearer", user: fixtureUser(owner) })).toString("base64url")}`, domain: "127.0.0.1", path: "/", httpOnly: false, secure: false, sameSite: "Lax" };
}
export function identity(request) {
  const token = request.headers.authorization?.replace(/^Bearer /i, "") ?? "";
  const [head, payload, signature] = token.split(".");
  if (!head || !payload || createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url") !== signature) return null;
  try { const claims = JSON.parse(Buffer.from(payload, "base64url").toString()); return claims.exp > Date.now() / 1000 && [fixtureOwner, fixtureOther].includes(claims.sub) ? claims.sub : null; } catch { return null; }
}
const booking = (owner, service = "flight") => ({ service, trip: { type: "return", sectors: service === "hotel" ? [] : [{ from: "New Delhi (DEL)", to: "Paris (CDG)", departure: "2099-06-15" }], returnDate: "2099-06-20" }, hotels: service === "flight" ? [] : [{ city: "Paris", country: "France", checkIn: "2099-06-16", checkOut: "2099-06-20", rooms: 1, preference: "" }], passengers: [{ givenNames: "Synthetic", surname: "Workspace", singleName: false, dob: "1990-01-01", sex: "F", nationality: "" }], communication: { accountEmail: fixtureUser(owner).email, channel: "email", whatsapp: "", alternateContact: "", purpose: "", appointmentDate: "", specialInstructions: "SYNTHETIC WORKSPACE FIXTURE ONLY" }, confirmations: { detailsCorrect: true, termsAccepted: true } });

export async function startWorkspaceFixture(port = 3211) {
  const orders = Array.from({ length: 17 }, (_, index) => ({ id: id(index + 1), owner_id: fixtureOwner, reference: `DT-WS-ONLY-${String(index + 1).padStart(3, "0")}`, created_at: new Date(Date.UTC(2026, 9, 31 - index, 10)).toISOString(), service_type: ["flight", "hotel", "combo"][index % 3], booking_snapshot: booking(fixtureOwner, ["flight", "hotel", "combo"][index % 3]), passenger_count: 1, unit_price_minor: index % 3 === 2 ? 119900 : 69900, total_minor: index % 3 === 2 ? 119900 : 69900, currency: "INR", payment_status: index < 2 ? "awaiting_payment" : "paid", fulfilment_status: index < 2 ? "not_started" : index % 3 === 0 ? "processing" : "documents_ready", policy_version: "SYNTHETIC-ONLY", policy_snapshot: "Synthetic browser fixture only. Not a real booking or payment." }));
  orders.push({ ...orders[2], id: id(99), owner_id: fixtureOther, reference: "DT-OTHER-PRIVATE", booking_snapshot: booking(fixtureOther, "combo") });
  const drafts = ["flight", "hotel", "combo"].map((service, index) => ({ id: id(200 + index), owner_id: fixtureOwner, data: booking(fixtureOwner, service), status: "draft", revision: 1, updated_at: "2026-10-31T11:00:00Z" }));
  delete drafts[0].data.service; // Legacy flight drafts remain searchable.
  drafts.push({ ...drafts[0], id: id(299), owner_id: fixtureOther, data: booking(fixtureOther) });
  const document = (n, order, extra = {}) => ({ id: id(300 + n), order_id: order.id, kind: "flight", version: n, state: "ready", size_bytes: 2048, created_at: "2026-11-01T10:00:00Z", published_at: "2026-11-01T10:00:00Z", withdrawn_at: null, ...extra });
  const documents = [document(1, orders[2]), document(2, orders[2], { kind: "hotel" }), document(3, orders[3]), document(4, orders[2], { withdrawn_at: "2026-11-02T10:00:00Z" }), document(5, orders[0]), document(6, orders.at(-1)), document(7, orders[2], { published_at: null }), document(8, orders[2], { state: "pending" })];
  const notifications = [{ id: id(400), order_id: orders[2].id, owner_id: fixtureOwner, event: "document_ready", created_at: "2026-11-01T10:00:00Z", read_at: null }];
  let forbiddenReads = 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const owner = identity(request);
    const send = (body, status = 200) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(body)); };
    if (!owner) return send({ message: "Synthetic session required" }, 401);
    if (url.pathname === "/auth/v1/user") return send(fixtureUser(owner));
    if (url.pathname === "/auth/v1/logout") return send({});
    if (url.pathname === "/rest/v1/rpc/read_order_notification") {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const { p_id } = JSON.parse(Buffer.concat(chunks).toString());
      const item = notifications.find(item => item.id === p_id && item.owner_id === owner);
      if (!item) return send({ message: "Unavailable" }, 404);
      item.read_at = new Date().toISOString(); return send(null);
    }
    const table = url.pathname.split("/").at(-1);
    const ownership = table === "order_documents" ? "orders.owner_id" : "owner_id";
    if (!["orders", "booking_drafts", "order_documents", "order_notifications"].includes(table)) return send({ message: "Unsupported synthetic operation" }, 400);
    const ownedDocumentOrder = table === "order_documents" && orders.some(order => order.owner_id === owner && url.searchParams.get("order_id") === `eq.${order.id}`);
    if (url.searchParams.get(ownership) !== `eq.${owner}` && !ownedDocumentOrder) { forbiddenReads++; return send({ message: "Explicit owner scope required" }, 403); }
    let rows = table === "orders" ? orders : table === "booking_drafts" ? drafts : table === "order_notifications" ? notifications : documents.map(doc => ({ ...doc, orders: orders.find(order => order.id === doc.order_id) }));
    rows = rows.filter(row => (table === "order_documents" ? row.orders?.owner_id : row.owner_id) === owner);
    for (const [key, filter] of url.searchParams) {
      if (["select", "order", "offset", "limit", "or"].includes(key)) continue;
      const [operator, ...rest] = filter.split("."); const expected = rest.join(".");
      const read = row => key.startsWith("orders.") ? row.orders?.[key.slice(7)] : key === "data->>service" ? row.data?.service : row[key];
      rows = rows.filter(row => operator === "eq" ? String(read(row)) === expected : operator === "ilike" ? String(read(row)).toUpperCase().startsWith(expected.replace(/%$/, "").toUpperCase()) : operator === "is" ? expected === "null" ? read(row) == null : true : operator === "not" && expected === "is.null" ? read(row) != null : operator === "in" ? expected.replace(/[()]/g, "").split(",").includes(String(read(row))) : false);
    }
    if (url.searchParams.has("or")) rows = rows.filter(row => !row.data?.service || row.data.service === "flight");
    const ordering = (url.searchParams.get("order") || "").split(",");
    rows = [...rows].sort((a, b) => { for (const item of ordering) { const [column, direction] = item.split("."); const value = String(a[column]).localeCompare(String(b[column])); if (value) return direction === "desc" ? -value : value; } return 0; });
    const total = rows.length, offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 1000);
    rows = rows.slice(offset, offset + limit);
    response.setHeader("Content-Range", `${offset}-${offset + rows.length - 1}/${total}`);
    if (request.method === "HEAD") { response.writeHead(200); return response.end(); }
    if (request.headers.accept?.includes("vnd.pgrst.object")) return send(rows[0] ?? null);
    return send(rows);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return { url: `http://127.0.0.1:${port}`, key, forbiddenReads: () => forbiddenReads, close: () => new Promise(resolve => server.close(resolve)) };
}
