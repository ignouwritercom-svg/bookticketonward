import "server-only";
import { NextResponse } from "next/server";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex",
    },
  });
}
export function failure(message: string, status = 400) {
  return json({ error: message }, status);
}
export const unavailable = () =>
  failure(
    "Account services are currently unavailable. Please try again later; this action has not saved your details.",
    503,
  );

export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  // Next's proxy may normalize request.url to its internal hostname. Compare
  // the browser Origin with the actual HTTP Host, never a forwarded-host input.
  const expectedOrigin = `${url.protocol}//${request.headers.get("host") || url.host}`;
  return request.headers.get("origin") === expectedOrigin;
}

export async function readBody(request: Request, maxBytes = 32768) {
  if (
    !sameOrigin(request) ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    throw new Error("request");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("request");
  let size = 0;
  let body = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("request");
    }
    body += decoder.decode(value, { stream: true });
  }
  return JSON.parse(body + decoder.decode()) as unknown;
}
