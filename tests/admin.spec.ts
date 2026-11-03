import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AxeBuilder from "@axe-core/playwright";
import { OrderDetails } from "../src/components/account/order-details";
import { AdminDenied } from "../src/components/admin/access";
import { bookingPolicy } from "../src/config/business";
import type { Order } from "../src/lib/account";
import type { OrderDocument } from "../src/lib/documents";

const id = "11111111-1111-4111-8111-111111111111";
test("unauthenticated admin routes and document APIs fail closed with private cache headers", async ({page,request}) => {
  for(const path of ["/admin","/admin/orders",`/admin/orders/${id}`]) {
    const response=await page.goto(path);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(page.getByRole("heading",{name:"Admin services unavailable"})).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, nofollow");
    await expect(page.getByRole("button",{name:"Start processing"})).toHaveCount(0);
  }
  for(const suffix of ["","/upload"]) {
    const response=await request.post(`/api/admin/orders/${id}${suffix}`, {headers:{Origin:"http://127.0.0.1:3100"},data:{action:"start"}});
    expect(response.status()).toBe(403);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const forged=await request.post(`/api/admin/orders/${id}${suffix}`, {headers:{Origin:"https://evil.test"},data:{action:"start"}});
    expect(forged.status()).toBe(403);
  }
  const download=await request.get(`/api/documents/${id}`);
  expect(download.status()).toBe(401);
  expect(download.headers()["cache-control"]).toContain("no-store");
  expect(await download.text()).not.toContain("%PDF");
});

test("SYNTHETIC customer published PDF presentation and staff denial remain accessible", async ({page}) => {
  const order: Order = {
    id,reference:"DT-ISOLATED-TEST",created_at:"2026-10-22T10:00:00Z",currency:"INR",unit_price_minor:69900,total_minor:69900,passenger_count:1,
    payment_status:"paid",fulfilment_status:"documents_ready",policy_version:bookingPolicy.version,policy_snapshot:bookingPolicy.text,
    booking_snapshot:{trip:{type:"one-way",sectors:[{from:"Delhi",to:"Dubai",departure:"2099-06-15"}],returnDate:""},passengers:[{givenNames:"Synthetic",surname:"Traveller",singleName:false,dob:"1990-01-01",sex:"F",nationality:""}],communication:{accountEmail:"fixture@example.test",channel:"email",whatsapp:"",alternateContact:"",purpose:"",appointmentDate:"",specialInstructions:""},confirmations:{detailsCorrect:true,termsAccepted:true}},
  };
  const pdfDocument: OrderDocument={id,order_id:id,version:2,state:"ready",size_bytes:200,created_at:order.created_at,published_at:order.created_at,withdrawn_at:null};
  await page.goto("/account/orders");
  await page.locator("main").evaluate((element,html)=>{element.innerHTML=html;},renderToStaticMarkup(createElement(OrderDetails,{order,documents:[pdfDocument]})));
  await expect(page.getByRole("heading",{name:"Your documents"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Download PDF · Version 2"})).toHaveAttribute("href",`/api/documents/${id}`);
  await expect(page.getByText("Documents ready",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Private staff notes"})).toHaveCount(0);
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.goto("/admin");
  await page.locator("main").evaluate((element,html)=>{element.innerHTML=html;},renderToStaticMarkup(createElement(AdminDenied)));
  await expect(page.getByRole("heading",{name:"Staff access required"})).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
});
