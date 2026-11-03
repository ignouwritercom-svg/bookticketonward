import { artifact } from "./artifacts";
import { test,expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { bookingSchema,createBookingDraft,validateBookingStep } from "../src/lib/booking";
import { getReservationQuote,reservationPolicy } from "../src/config/business";

async function fillStay(page:Page,index=1,checkIn="2099-06-16",checkOut="2099-06-20") {
  const stay=page.getByRole("group",{name:`Hotel stay ${index}`,exact:true});
  await stay.getByLabel("Hotel city",{exact:true}).fill(index===1 ? "Paris" : "Rome");
  await stay.getByLabel("Country",{exact:true}).fill(index===1 ? "France" : "Italy");
  await stay.getByLabel("Check-in date",{exact:true}).fill(checkIn);
  await stay.getByLabel("Check-out date",{exact:true}).fill(checkOut);
}
async function travellerAndContact(page:Page) {
  await page.getByRole("button",{name:"Continue to passengers"}).click();
  await page.getByLabel("Given names (including middle names)",{exact:true}).fill("Synthetic");
  await page.getByLabel("Surname",{exact:true}).fill("Guest");
  await page.getByLabel("Date of birth",{exact:true}).fill("1990-01-01");
  await page.getByLabel("Sex as shown on travel document",{exact:true}).selectOption("F");
  await page.getByRole("button",{name:"Continue to communication"}).click();
  await page.getByLabel("Account email",{exact:true}).fill("hotel@example.test");
  await page.getByRole("button",{name:"Review details",exact:true}).click();
}

test("shared hotel validation, approved pricing and URL privacy",()=>{
  const draft=createBookingDraft(new URLSearchParams("service=hotel&email=private@example.test&hotelCity=Ignored&rooms=99"));
  expect(draft.service).toBe("hotel");
  expect(draft.communication.accountEmail).toBe("");
  expect(draft.hotels?.[0].city).toBe("");
  expect(draft.hotels?.[0].rooms).toBe(1);
  draft.hotels=[{city:" Paris ",country:"France",checkIn:"2099-06-16",checkOut:"2099-06-20",rooms:1,preference:""}];
  expect(validateBookingStep(draft,0).success).toBe(true); // blank flight is irrelevant
  draft.passengers=[{givenNames:"Test",surname:"Guest",singleName:false,dob:"1990-01-01",sex:"F",nationality:""}];
  draft.communication.accountEmail="hotel@example.test";
  draft.confirmations={detailsCorrect:true,termsAccepted:true};
  const parsed=bookingSchema.parse(draft);
  expect(parsed.trip.sectors).toEqual([]);
  expect(parsed.hotels[0].city).toBe("Paris");
  expect(getReservationQuote("one-way",1,"hotel",1).totalMinor).toBe(69900);
  expect(getReservationQuote("return",1,"combo",1).totalMinor).toBe(119900);
  expect(getReservationQuote("multi-city",1,"combo",1).totalMinor).toBe(149900);
  draft.hotels[0].rooms=2;
  expect(bookingSchema.safeParse(draft).success).toBe(false);
  draft.hotels[0].rooms=1;
  draft.hotels[0].checkOut="2099-06-16";
  expect(validateBookingStep(draft,0).success).toBe(false);
  draft.hotels[0].checkOut="2099-08-20";
  expect(validateBookingStep(draft,0).success).toBe(false);
});

test("hotel-only booking skips flights, validates stays and renders accessible mobile review",async({page})=>{
  await page.goto("/");
  await page.getByRole("link",{name:/Dummy Hotel Booking Already have your flight/}).click();
  await expect(page).toHaveURL(/service=hotel/);
  // Next can retain the previous homepage tree while it is hidden.
  await expect(page.locator("#booking-main").getByLabel("From",{exact:true})).toHaveCount(0);
  await fillStay(page,1,"2099-06-16","2099-06-16");
  await page.getByRole("button",{name:"Continue to passengers"}).click();
  await expect(page.getByText("Check-out must be after check-in.",{exact:true})).toBeVisible();
  await page.getByLabel("Check-out date",{exact:true}).fill("2099-06-20");
  await page.getByRole("button",{name:"Add another hotel stay"}).click();
  await fillStay(page,2,"2099-06-19","2099-06-23");
  await page.getByRole("button",{name:"Continue to passengers"}).click();
  await expect(page.getByText("Stays must be in date order and must not overlap.",{exact:true})).toBeVisible();
  await page.getByRole("group",{name:"Hotel stay 2",exact:true}).getByLabel("Check-in date").fill("2099-06-20");
  await expect(page.getByTestId("booking-total")).toHaveText("₹1,398");
  await travellerAndContact(page);
  await expect(page.getByRole("heading",{name:"Hotel stays",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:/Your trip/})).toHaveCount(0);
  await expect(page.getByText("Paris, France",{exact:true}).first()).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
  expect(page.url()).not.toContain("Synthetic");
  await page.screenshot({path:artifact("hotel-review-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:artifact("hotel-review-mobile.png"),fullPage:true});
});

test("MOCKED combo saves one canonical draft and creates one correctly priced unpaid order",async({page})=>{
  const customer={id:"11111111-1111-4111-8111-111111111111",email:"hotel@example.test"};
  let saved=false,ordered=false;
  await page.route("**/api/auth/session",route=>route.fulfill({json:{configured:true,user:customer,otpLength:6}}));
  await page.route("**/api/bookings",async route=>{
    const body=route.request().postDataJSON();
    if(body.action==="save") {
      const booking=bookingSchema.parse(body.booking);
      expect(booking.service).toBe("combo"); expect(booking.hotels).toHaveLength(1); expect(booking.passengers).toHaveLength(1);
      saved=true;
      return route.fulfill({json:{draft:{id:body.id,revision:1,status:"draft",data:booking,updated_at:"2026-11-02T10:00:00Z"}}});
    }
    expect(body.expectedUnitPriceMinor).toBe(119900); expect(body.expectedPolicyVersion).toBe(reservationPolicy.version);
    ordered=true;
    return route.fulfill({status:503,json:{error:"Synthetic order test complete; no live order created."}});
  });
  await page.goto("/book?service=combo&type=return&from=Delhi&to=Paris&departure=2099-06-15&returnDate=2099-06-20");
  await fillStay(page);
  await expect(page.getByTestId("booking-total")).toHaveText("₹1,199");
  await travellerAndContact(page);
  await expect(page.getByRole("heading",{name:/Your trip/})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Hotel stays",exact:true})).toBeVisible();
  await expect(page.getByText("Combo saving per traveller",{exact:true})).toBeVisible();
  await page.getByLabel("I confirm that the passenger names and trip details are correct.").check();
  await page.getByLabel("I have read and accept the draft service terms for this preview.").check();
  await page.getByRole("button",{name:"Save reviewed draft"}).click();
  await expect(page.getByRole("button",{name:"Create order — awaiting payment"})).toBeVisible();
  expect(saved).toBe(true);
  await page.getByRole("button",{name:"Create order — awaiting payment"}).click();
  await expect(page.getByText("Synthetic order test complete; no live order created.")).toBeVisible();
  expect(ordered).toBe(true);
});
