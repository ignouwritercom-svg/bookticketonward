# Flight, hotel and combo research — 2 November 2026

A small comparison of public competitor pages, not a market-wide survey. These are advertised prices; reservation quality, validity and visa outcomes were not independently verified. No purchase or message was sent.

| Competitor | Advertised offer | Useful pattern |
| --- | --- | --- |
| [FlyDummyTicket](https://flydummyticket.com/) | Flight ₹299/person; hotel ₹249/voucher; combo ₹499/package | Separate service choices and a short starter. Billing units differ, so these are not directly comparable per-person prices. |
| [DummyTicket.shop](https://dummyticket.shop/pricing) | Flight $4.99/traveller; hotel $4.99/room; bundle $8 for one traveller + one room/stay | Explicit room/traveller units and coordinated dates/delivery. |
| [Dummy Tickets Visa](https://dummyticketsvisa.com/dummy-ticket-and-hotel-booking/) | Opened page: ₹2,400/passenger for flight + one hotel, split ₹1,200 + ₹1,200 | One traveller entry, hotel city/check-in/check-out fields and extra-stay charges. The search snippet still showed an older ₹1,398; the opened page was used. |

## Implemented decisions

- Three prominent services: Flight reservation, Hotel reservation and Flight + Hotel.
- Hotel-only flow requires no flight fields. Combo uses one traveller/contact entry for both services.
- City/country, independent check-in/check-out, room count and optional property/area preference. No invented inventory, ratings, confirmation numbers or availability.
- Up to four ordered non-overlapping stays, maximum 30 nights each. All order travellers are included on each stay; split-party room allocation is outside this version.
- Arrival dates remain editable: a flight departure date alone cannot determine the arrival date. Overnight flights may arrive the following day.
- Transparent service fees, per-traveller units, extra-stay charges and combo discount before saving. Hotel service fees do not pay room rent.
- Private account delivery; no passenger names/DOB in WhatsApp URLs. Staff links contain only the selected contact and order reference.
- No copied claims of guaranteed visa acceptance, fixed validity, affiliations or invented reviews. Staff must arrange genuine reservations before publishing documents.

## User-approved preview prices

| Service | Fee |
| --- | --- |
| One-way/return flight | Existing ₹699 per traveller |
| Multi-city flight | Existing ₹999 per traveller |
| Hotel reservation | ₹699 per traveller per stay |
| One-way/return flight + one hotel | ₹1,199 per traveller |
| Multi-city flight + one hotel | ₹1,499 per traveller |
| Each extra hotel stay | +₹699 per traveller |

The user selected this model after reviewing two proposals. Combo discount is ₹199 per traveller, once per order. Two travellers with return flights and two stays total `(699 + 2 × 699 − 199) × 2 = ₹3,796`. Room and night counts do not multiply the service fee. Application and private database catalog independently calculate integer-paise totals. Payments remain disabled.

Supplier arrangements, live availability, final refund/change terms and hosted fulfilment verification remain launch prerequisites. These preview fees do not establish that every requested reservation can be supplied.
