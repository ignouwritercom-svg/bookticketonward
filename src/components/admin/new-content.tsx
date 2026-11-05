"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function NewContent() {
  const router = useRouter();
  const [kind, setKind] = useState("guide"), [slug, setSlug] = useState(""), [error, setError] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) { setError("Use lowercase words separated by hyphens, up to 80 characters."); return; } router.push(`/admin/editor/${kind}--${slug}`); };
  return <form className="ops-editor" onSubmit={submit}><h2>Choose the article URL</h2><label htmlFor="new-content-kind">Content type</label><select id="new-content-kind" value={kind} onChange={event => setKind(event.target.value)}><option value="guide">Planning guide</option><option value="destination">Destination guidance</option></select><label htmlFor="new-content-slug">URL slug</label><input id="new-content-slug" value={slug} onChange={event => setSlug(event.target.value)} maxLength={80} autoComplete="off" aria-invalid={!!error} aria-describedby="new-content-hint" /><p id="new-content-hint" className="ops-field-hint">URL: /{kind === "guide" ? "guides" : "destinations"}/{slug || "your-article"}. Saved URLs stay fixed to prevent broken links.</p>{error && <p className="ops-error" role="alert">{error}</p>}<button type="submit" className="button button-primary">Open new draft</button></form>;
}
