"use client";

import { useRef } from "react";
import { useController, useFormContext, useWatch, type FieldPath } from "react-hook-form";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import type { LocationKind, LocationOption } from "@/lib/location-types";
import type { BookingDraft } from "@/lib/booking";

export function BookingLocationField({ name, label, kind, hint, country, onTextChange, onSelect }: {
  name: FieldPath<BookingDraft>; label: string; kind: LocationKind; hint?: string; country?: string;
  onTextChange?: (value: string) => void; onSelect?: (option: LocationOption) => void;
}) {
  const { control, clearErrors } = useFormContext<BookingDraft>();
  const { field, fieldState: { error } } = useController({ control, name });
  const id = `booking-${name.replaceAll(".", "-")}`;
  return <div className="booking-field"><label htmlFor={id}>{label}</label>
    <LocationAutocomplete id={id} label={label} name={field.name} inputRef={field.ref} kind={kind} country={country} value={typeof field.value === "string" ? field.value : ""} onBlur={field.onBlur}
      onChange={value => { onTextChange?.(value); field.onChange(value); clearErrors(name); }} onSelect={onSelect}
      maxLength={kind === "country" ? 80 : 100} placeholder={kind === "airport" ? "Search city or airport code" : kind === "city" ? "Search hotel destination" : "Search country"}
      aria-invalid={!!error} aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined} />
    {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}{error && <p id={`${id}-error`} className="field-error">{error.message}</p>}
  </div>;
}

export function HotelLocationFields({ index }: { index: number }) {
  const { control, getValues, setValue, clearErrors } = useFormContext<BookingDraft>();
  const cityName = `hotels.${index}.city` as const;
  const countryName = `hotels.${index}.country` as const;
  const country = useWatch({ control, name: countryName });
  const autoCountry = useRef<{ city: string; country: string } | null>(null);
  return <>
    <BookingLocationField name={cityName} label="Hotel city" kind="city" country={country} hint="Choose a destination to fill its country, or enter both yourself."
      onTextChange={value => {
        if (autoCountry.current && value !== autoCountry.current.city && getValues(countryName) === autoCountry.current.country) {
          setValue(countryName, "", { shouldDirty: true }); clearErrors(countryName); autoCountry.current = null;
        }
      }}
      onSelect={option => { setValue(countryName, option.country, { shouldDirty: true, shouldValidate: true }); autoCountry.current = { city: option.value, country: option.country }; }} />
    <BookingLocationField name={countryName} label="Country" kind="country" onTextChange={() => { autoCountry.current = null; }} />
  </>;
}
