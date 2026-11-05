import { z } from "zod";
import { failure, json, readBody, sameOrigin } from "@/lib/api";
import { searchLocations } from "@/lib/location-search";

const querySchema = z.object({ kind: z.enum(["airport", "city", "country"]), query: z.string().trim().max(100), country: z.string().trim().max(80).optional() }).strict();

// Public reference names only. No auth, customer data, gateway or live supplier
// is involved. POST keeps typed searches out of URLs/access-log query strings.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure("Use the location search on this website.", 403);
  let parsed: ReturnType<typeof querySchema.safeParse>;
  try { parsed = querySchema.safeParse(await readBody(request)); } catch { return failure("Enter a valid location search."); }
  if (!parsed.success) return failure("Enter a valid location search.");
  try {
    return json({ results: await searchLocations(parsed.data.kind, parsed.data.query, parsed.data.country) });
  } catch {
    return failure("Location suggestions are temporarily unavailable. You can still enter your location.", 503);
  }
}
