import type { HotelStay } from "@/lib/booking";
import { formatTravelDate } from "@/lib/trip";
export function HotelSummary({hotels}:{hotels:HotelStay[]}) {
  return <ol className="hotel-summary">{hotels.map((stay,index)=><li key={index}><strong>{stay.city || "Hotel city"}{stay.country && `, ${stay.country}`}</strong><p>{formatTravelDate(stay.checkIn)} → {formatTravelDate(stay.checkOut)}</p><p>{stay.rooms} room(s) · All order travellers</p>{stay.preference && <p>Preference: {stay.preference}</p>}</li>)}</ol>;
}
