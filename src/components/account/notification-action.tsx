"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/lib/account";

export function NotificationAction({ id, retry = false, ambiguous = false }: { id: string; retry?: boolean; ambiguous?: boolean }) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      await accountRequest(retry ? "/api/admin/notifications" : "/api/notifications", { id, requestId: requestId.current, acknowledgeDuplicate: acknowledged });
      const heading = button.current?.closest("article, li")?.querySelector<HTMLElement>("h2,h3");
      if (heading) { heading.tabIndex = -1; heading.focus(); }
      startTransition(() => router.refresh());
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update notification."); }
    finally { setBusy(false); inFlight.current = false; }
  }
  return <div className="notification-action">
    {ambiguous && <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> I reviewed the unknown delivery outcome and accept the risk of a duplicate email. Retry is available after a 10-minute review window.</label>}
    <button ref={button} type="button" className="button button-secondary" disabled={busy || pending || (ambiguous && !acknowledged)} onClick={submit}>{busy || pending ? "Updating…" : retry ? "Retry notification" : "Mark as read"}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
