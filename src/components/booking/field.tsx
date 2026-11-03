"use client";

import { useFormContext, type FieldPath } from "react-hook-form";
import type { BookingDraft } from "@/lib/booking";

type Props = {
  name: FieldPath<BookingDraft>;
  label: string;
  hint?: string;
  type?: "text" | "date" | "email" | "tel";
  min?: string;
  max?: string;
  maxLength?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  multiline?: boolean;
  disabled?: boolean;
};

export function BookingField({
  name,
  label,
  hint,
  options,
  multiline,
  ...inputProps
}: Props) {
  const { register, getFieldState, formState, clearErrors } =
    useFormContext<BookingDraft>();
  const { error } = getFieldState(name, formState);
  const id = `booking-${name.replaceAll(".", "-")}`;
  const props = {
    id,
    ...register(name, { onChange: () => clearErrors(name) }),
    "aria-invalid": !!error,
    "aria-describedby":
      [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
        .filter(Boolean)
        .join(" ") || undefined,
    autoComplete: "off",
  };
  return (
    <div className="booking-field">
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select {...props}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          {...props}
          rows={4}
          maxLength={inputProps.maxLength}
          placeholder={inputProps.placeholder}
        />
      ) : (
        <input {...props} {...inputProps} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error.message}
        </p>
      )}
    </div>
  );
}

export function BookingCheckbox({
  name,
  label,
  onChange,
}: {
  name: FieldPath<BookingDraft>;
  label: string;
  onChange?: () => void;
}) {
  const { register, getFieldState, formState, clearErrors } =
    useFormContext<BookingDraft>();
  const { error } = getFieldState(name, formState);
  const id = `booking-${name.replaceAll(".", "-")}`;
  return (
    <div className="booking-checkbox-wrap">
      <label className="booking-checkbox" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          {...register(name, {
            onChange: () => {
              clearErrors(name);
              onChange?.();
            },
          })}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error.message}
        </p>
      )}
    </div>
  );
}
