import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: "#edf5f2", color: "#142b3e", padding: 80 }}><div style={{ display: "flex", color: "#06655f", fontSize: 32, marginBottom: 36 }}>DummyTicket</div><div style={{ display: "flex", fontSize: 65, fontWeight: 700 }}>Dummy flight tickets.</div><div style={{ display: "flex", fontSize: 65, fontWeight: 700 }}>Dummy hotel bookings.</div><div style={{ display: "flex", fontSize: 28, marginTop: 40 }}>Temporary reservation documents. Clear service fees.</div></div>, { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" } });
}
