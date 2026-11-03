"use client";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { business, formatPrice, serviceLabels, type ServiceType } from "@/config/business";
import { emptyHotelStay, emptySector, type BookingDraft } from "@/lib/booking";
import { BookingField } from "./field";
import { TripStep } from "./trip-step";

export function ServiceStep({today}:{today:string}) {
  const {control,register,getValues,setValue,clearErrors,setFocus,formState:{errors}}=useFormContext<BookingDraft>();
  const service=useWatch({control,name:"service"}) ?? "flight";
  const {fields,append,remove}=useFieldArray({control,name:"hotels"});
  return <>
    <fieldset className="booking-trip-types service-selector"><legend>What would you like to book?</legend><div className="trip-types">
      {Object.entries(serviceLabels).map(([value,label])=><label className="trip-type" key={value}><input type="radio" value={value} checked={service===value} {...register("service",{onChange:event=>{
        const selected=event.target.value as ServiceType;
        if(selected!=="flight" && !getValues("hotels")?.length) append(emptyHotelStay(),{shouldFocus:false});
        if(selected!=="hotel" && !getValues("trip.sectors").length) setValue("trip.sectors",[emptySector()]);
        clearErrors();
      }})} /><span>{label}</span></label>)}
    </div></fieldset>
    {service!=="hotel" && <TripStep today={today} />}
    {service!=="flight" && <section aria-labelledby="hotel-stays-heading"><h3 id="hotel-stays-heading">Hotel stays</h3>
      <p className="booking-help">All travellers on this order will be named on each hotel reservation. {formatPrice(business.hotelPriceMinor)} per traveller, per stay—not per night or room. This service fee does not pay for accommodation.</p>
      {service==="combo" && <p className="booking-help">Enter hotel arrival dates separately: overnight flights may arrive the next day. Review flight and hotel dates together before saving.</p>}
      {fields.map((field,index)=><fieldset className="booking-entry" key={field.id}><legend>Hotel stay {index+1}</legend>
        {fields.length>1 && <button type="button" className="remove-button" onClick={()=>{remove(index);clearErrors("hotels");requestAnimationFrame(()=>setFocus(`hotels.${Math.max(0,index-1)}.city`));}} aria-label={`Remove hotel stay ${index+1}`}>Remove stay</button>}
        <div className="booking-fields-grid">
          <BookingField name={`hotels.${index}.city`} label="Hotel city" maxLength={100} placeholder="e.g. Paris" />
          <BookingField name={`hotels.${index}.country`} label="Country" maxLength={80} placeholder="e.g. France" />
          <BookingField name={`hotels.${index}.checkIn`} label="Check-in date" type="date" min={today} />
          <BookingField name={`hotels.${index}.checkOut`} label="Check-out date" type="date" min={today} />
          <div className="booking-field"><label htmlFor={`rooms-${index}`}>Rooms</label><input id={`rooms-${index}`} type="number" min={1} max={business.maxPassengers} {...register(`hotels.${index}.rooms`,{valueAsNumber:true})} aria-invalid={!!errors.hotels?.[index]?.rooms} aria-describedby={errors.hotels?.[index]?.rooms ? `rooms-error-${index}` : undefined} />{errors.hotels?.[index]?.rooms && <p className="field-error" id={`rooms-error-${index}`}>{errors.hotels[index]?.rooms?.message}</p>}</div>
          <BookingField name={`hotels.${index}.preference`} label="Hotel or area preference (optional)" maxLength={120} hint="A preference, not a confirmed property or availability guarantee." />
        </div>
      </fieldset>)}
      {fields.length<business.maxHotelStays && <button type="button" className="button button-secondary" onClick={()=>append(emptyHotelStay(),{focusName:`hotels.${fields.length}.city`})}>Add another hotel stay</button>}
      <p className="field-hint">Up to {business.maxHotelStays} stays, {business.maxHotelNights} nights each. Stays must be in date order without overlaps. Room count cannot exceed travellers.</p>
    </section>}
  </>;
}
