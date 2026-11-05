"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Clock3, Mail, MessageCircle } from "lucide-react";
import { deliveryTarget as defaultDelivery, workingHours as defaultHours } from "@/config/business";
import { preferenceDelivery, preferenceHours, type SitePreferences } from "@/lib/site-runtime";
import type { BookingDraft } from "@/lib/booking";
import { BookingField } from "./field";

export function DeliveryInformation({ settings }: { settings?: SitePreferences }) {
  const deliveryTarget = settings ? preferenceDelivery(settings) : defaultDelivery, workingHours = settings ? preferenceHours(settings) : defaultHours;
  return (
    <div className="booking-note delivery-information">
      <Clock3 size={19} />
      <div>
        <strong>Prepared manually by our team</strong>
        <p>
          Delivery target: {deliveryTarget} after verified payment and complete
          details, during working hours.
        </p>
        <p>
          {workingHours}. Outside these hours, processing starts in the next
          working period. This is an estimate, not a guaranteed deadline or
          fixed reservation validity.
        </p>
      </div>
    </div>
  );
}

export function CommunicationStep({ today, settings }: { today: string; settings?: SitePreferences }) {
  const { register, control, clearErrors } = useFormContext<BookingDraft>();
  const channel = useWatch({ control, name: "communication.channel" });
  return (
    <>
      <BookingField
        name="communication.accountEmail"
        label="Account email"
        type="email"
        maxLength={254}
        hint="Required for OTP sign-in and account/order updates, even with WhatsApp document delivery. These account emails are separate from your delivery preference. Verify this email at review before saving."
      />
      <fieldset className="delivery-choices">
        <legend>Preferred delivery channel</legend>
        <div>
          {[
            { value: "email", label: "Email", icon: Mail },
            { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
          ].map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                value={option.value}
                {...register("communication.channel", {
                  onChange: () => clearErrors("communication.whatsapp"),
                })}
              />
              <option.icon size={20} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {channel === "whatsapp" ? (
        <BookingField
          name="communication.whatsapp"
          label="WhatsApp number with country code"
          type="tel"
          maxLength={30}
          placeholder="+ followed by country code and number"
          hint="Use +country code and 7–15 digits. Spaces, brackets and hyphens are accepted."
        />
      ) : (
        <div className="booking-note">
          <Mail size={18} />
          <p>
            Email delivery uses your account email. You’ll verify it at the
            review step. A separate delivery email is not needed.
          </p>
        </div>
      )}
      <div className="booking-fields-grid contact-extra">
        <BookingField
          name="communication.alternateContact"
          label="Alternate contact (optional)"
          maxLength={254}
          hint="An email address or phone number with +country code."
        />
        <BookingField
          name="communication.purpose"
          label="Purpose (optional)"
          maxLength={120}
          placeholder="For example, visa application"
        />
        <BookingField
          name="communication.appointmentDate"
          label="Appointment / submission date (optional)"
          type="date"
          min={today}
        />
      </div>
      <BookingField
        name="communication.specialInstructions"
        label="Special instructions (optional)"
        multiline
        maxLength={2000}
        hint="Up to 2,000 characters. Please do not enter passport numbers, payment information or other sensitive identifiers."
      />
      <DeliveryInformation settings={settings} />
    </>
  );
}
