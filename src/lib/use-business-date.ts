"use client";

import { useSyncExternalStore } from "react";
import { todayInBusinessTimezone } from "./trip";

function subscribe(callback: () => void) {
  const interval = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", callback);
  };
}
const serverDate = () => "";

export function useBusinessDate() {
  return useSyncExternalStore(subscribe, todayInBusinessTimezone, serverDate);
}
