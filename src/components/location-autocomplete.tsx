"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes, type RefCallback } from "react";
import { Globe2, MapPin, Plane, X } from "lucide-react";
import type { LocationKind, LocationOption } from "@/lib/location-types";
import "./location-autocomplete.css";

type Props = Pick<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "placeholder" | "maxLength" | "disabled" | "aria-invalid" | "aria-describedby"> & {
  id: string;
  label: string;
  kind: LocationKind;
  value: string;
  country?: string;
  onChange: (value: string) => void;
  onSelect?: (option: LocationOption) => void;
  onBlur?: () => void;
  inputRef?: RefCallback<HTMLInputElement>;
};
type Lookup = { key: string; status: "loading" | "ready" | "error"; options: LocationOption[] };

function isOption(value: unknown, kind: LocationKind): value is LocationOption {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LocationOption>;
  return item.kind === kind && typeof item.id === "string" && typeof item.value === "string" && item.value.length <= 100 && typeof item.label === "string" && typeof item.detail === "string" && typeof item.country === "string" && typeof item.countryCode === "string";
}

export function LocationAutocomplete({ label, kind, value, country, onChange, onSelect, onBlur, inputRef, ...props }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const readyKey = useRef<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);
  const [lookup, setLookup] = useState<Lookup>({ key: "", status: "ready", options: [] });
  const [position, setPosition] = useState({ above: false, height: 300 });
  const query = value.trim();
  const key = JSON.stringify([kind, query, country ?? ""]);
  const eligible = query.length !== 1;
  const options = lookup.key === key && lookup.status === "ready" ? lookup.options : [];
  const listVisible = open && options.length > 0;
  const activeId = listVisible && active >= 0 && active < options.length ? `${props.id}-option-${active}` : undefined;
  const loading = eligible && (lookup.key !== key || lookup.status === "loading");
  const failed = lookup.key === key && lookup.status === "error";
  const message = !eligible ? "Type at least 2 characters to search." : loading ? "Finding locations…" : failed ? "Suggestions are unavailable. You can still enter your location." : !options.length ? "No matching suggestions. You can keep your typed location." : `${options.length} suggestions available. Use up and down arrows, then Enter to choose.`;

  useEffect(() => {
    // The reference snapshot is static for this server session. Reopening the
    // current successful query can reuse its in-memory result without flashing
    // the list away during an unnecessary second request.
    if (!open || composing || !eligible || readyKey.current === key) return;
    const controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      readyKey.current = undefined;
      setLookup({ key, status: "loading", options: [] });
      deadline = setTimeout(() => { controller.abort(); setLookup({ key, status: "error", options: [] }); }, 5000);
      try {
        const response = await fetch("/api/locations", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, query, ...(kind === "city" && country ? { country } : {}) }), signal: controller.signal });
        if (!response.ok) throw new Error("lookup");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !Array.isArray((data as { results?: unknown }).results)) throw new Error("lookup");
        const results = (data as { results: unknown[] }).results.filter(item => isOption(item, kind)).slice(0, 8) as LocationOption[];
        if (!controller.signal.aborted) { readyKey.current = key; setLookup({ key, status: "ready", options: results }); }
      } catch {
        if (!controller.signal.aborted) setLookup({ key, status: "error", options: [] });
      } finally { clearTimeout(deadline); }
    }, 180);
    return () => { clearTimeout(timer); clearTimeout(deadline); controller.abort(); };
  }, [open, composing, eligible, key, kind, query, country]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (!input.current) return;
      const bounds = input.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = Math.max(viewport?.offsetTop ?? 0, document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0);
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight);
      const below = bottom - bounds.bottom - 12;
      const above = bounds.top - top - 12;
      const flip = below < 190 && above > below;
      const height = Math.max(90, Math.min(320, Math.floor(flip ? above : below)));
      setPosition(previous => previous.above === flip && previous.height === height ? previous : { above: flip, height });
    };
    const frame = requestAnimationFrame(measure);
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); window.visualViewport?.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("scroll", measure); };
  }, [open]);

  useEffect(() => { if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" }); }, [activeId]);

  const choose = (option: LocationOption) => { onChange(option.value); onSelect?.(option); setOpen(false); setActive(-1); input.current?.focus(); };
  const Icon = kind === "airport" ? Plane : kind === "city" ? MapPin : Globe2;
  return <div className="location-autocomplete" ref={root}>
    <div className="location-input-wrap"><input {...props} type="text" role="combobox" aria-autocomplete="list" aria-expanded={listVisible} aria-controls={listVisible ? `${props.id}-list` : undefined} aria-activedescendant={activeId} autoComplete="off" spellCheck={false} value={value}
      ref={element => { input.current = element; inputRef?.(element); }}
      onFocus={() => { setOpen(true); setActive(-1); }} onClick={() => setOpen(true)}
      onBlur={event => { onBlur?.(); if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || composing) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); const direction = event.key === "ArrowDown" ? 1 : -1; setActive(index => options.length ? index < 0 ? direction > 0 ? 0 : options.length - 1 : (index + direction + options.length) % options.length : -1); }
        else if (event.key === "Enter" && open) { event.preventDefault(); if (active >= 0 && options[active]) choose(options[active]); else setOpen(false); }
        else if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
        else if (event.key === "Tab") { setOpen(false); setActive(-1); }
      }} />
      {value && !props.disabled && <button type="button" className="location-clear" aria-label={`Clear ${label}`} onPointerDown={event => event.preventDefault()} onClick={() => { onChange(""); setOpen(true); setActive(-1); input.current?.focus(); }}><X size={17} aria-hidden="true" /></button>}
    </div>
    {open && <div className={`location-popover${position.above ? " location-popover-above" : ""}${position.height < 180 ? " location-popover-compact" : ""}`} style={{ maxHeight: position.height }}>
      {options.length ? <ul id={`${props.id}-list`} role="listbox" aria-label={`${label} suggestions`}>{options.map((option, index) => <li key={option.id} id={`${props.id}-option-${index}`} role="option" aria-label={`${option.label}, ${option.detail}`} aria-selected={index === active} className={index === active ? "location-option location-option-active" : "location-option"} onPointerDown={event => event.preventDefault()} onClick={() => choose(option)}><Icon size={18} aria-hidden="true" /><span className="location-option-copy"><strong>{kind === "airport" ? option.label.replace(/ \([A-Z]{3}\)$/, "") : option.label}</strong><span>{option.detail}</span></span>{option.code && kind === "airport" && <span className="location-code" aria-hidden="true">{option.code}</span>}</li>)}</ul> : <p className="location-search-message">{message}</p>}
      {options.length > 0 && <p className="location-popup-note">Choose a suggestion or keep your typed location.</p>}
    </div>}
    <span role="status" aria-live="polite" className="sr-only">{open ? message : ""}</span>
  </div>;
}
