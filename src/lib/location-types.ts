export type LocationKind = "airport" | "city" | "country";
export type LocationOption = {
  id: string;
  kind: LocationKind;
  value: string;
  label: string;
  detail: string;
  country: string;
  countryCode: string;
  code?: string;
};
