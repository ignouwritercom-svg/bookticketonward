export type AdminDestination = {
  href: string;
  label: string;
  description: string;
  icon: "overview" | "orders" | "documents" | "customers" | "content" | "settings" | "notifications" | "activity" | "guides" | "destinations" | "pricing" | "policies";
  keywords?: string;
};

export const adminGroups: { label: string; items: AdminDestination[] }[] = [
  { label: "Workspace", items: [
    { href: "/admin", label: "Overview", description: "Queues, exceptions and next actions", icon: "overview" },
  ] },
  { label: "Reservations", items: [
    { href: "/admin/orders", label: "Orders", description: "Find requests and manage preparation", icon: "orders", keywords: "booking paid unpaid fulfilment" },
    { href: "/admin/documents", label: "Documents", description: "Private PDF versions and publication", icon: "documents", keywords: "upload download pending withdrawn" },
    { href: "/admin/customers", label: "Customers", description: "Account search and order history", icon: "customers" },
  ] },
  { label: "Website & business", items: [
    { href: "/admin/content", label: "Content", description: "Pages, FAQs and editorial collections", icon: "content" },
    { href: "/admin/settings", label: "Settings", description: "Support, service fees and policies", icon: "settings" },
  ] },
  { label: "Monitoring", items: [
    { href: "/admin/notifications", label: "Notifications", description: "Delivery attempts and failed emails", icon: "notifications", keywords: "retry smtp messages" },
    { href: "/admin/activity", label: "Activity", description: "Order audit and website revisions", icon: "activity", keywords: "history logs" },
  ] },
];
export const contentDestinations: AdminDestination[] = [
  { href: "/admin/content?kind=page", label: "Pages & FAQs", description: "Service, help and policy page copy", icon: "content" },
  { href: "/admin/content?kind=guide", label: "Guides", description: "Planning articles and references", icon: "guides" },
  { href: "/admin/content?kind=destination", label: "Destinations", description: "Country guidance and official sources", icon: "destinations" },
];
export const settingsDestinations: AdminDestination[] = [
  { href: "/admin/editor/settings--site", label: "Website & support", description: "Homepage, approved contacts and timings", icon: "settings" },
  { href: "/admin/editor/pricing--catalog", label: "Service pricing", description: "Flight, hotel and combo fees", icon: "pricing" },
  { href: "/admin/editor/policies--booking", label: "Booking policies", description: "Versioned customer acceptance text", icon: "policies" },
];
export const adminDestinations: AdminDestination[] = [
  ...adminGroups.flatMap(group => group.items), ...contentDestinations, ...settingsDestinations,
  { href: "/admin/content/new", label: "New guide or destination", description: "Start a private editorial draft", icon: "content", keywords: "create add article" },
  { href: "/admin/orders?payment=paid&fulfilment=not_started&sort=oldest", label: "Ready to start", description: "Oldest paid requests awaiting preparation", icon: "orders", keywords: "queue priority" },
  { href: "/admin/documents?state=pending", label: "Pending uploads", description: "Review incomplete PDF confirmations", icon: "documents", keywords: "recover retry" },
];

export function adminDestinationMatches(path: string, search: { get(name: string): string | null }, href: string) {
  const [pathname, query] = href.split("?");
  return path === pathname && (!query || [...new URLSearchParams(query)].every(([key, value]) => search.get(key) === value));
}

export function adminLocation(path: string) {
  const parts = path.split("/").filter(Boolean);
  const editor = parts[1] === "editor";
  const businessEditor = editor && /^(settings|pricing|policies)--/.test(parts[2] ?? "");
  const modulePath = editor ? businessEditor ? "/admin/settings" : "/admin/content" : `/admin${parts[1] ? `/${parts[1]}` : ""}`;
  const section = adminGroups.flatMap(group => group.items).find(item => item.href === modulePath) ?? adminGroups[0].items[0];
  const group = adminGroups.find(group => group.items.some(item => item.href === section.href))!;
  const setting = settingsDestinations.find(item => path === item.href || path === `${item.href}/preview`);
  const detail = setting?.label ?? (editor ? "Content editor" : parts[2] === "new" ? "New article" : parts[2] ? modulePath === "/admin/orders" ? "Order details" : modulePath === "/admin/customers" ? "Customer history" : "Details" : null);
  const preview = editor && parts[3] === "preview";
  const context = modulePath === "/admin/content" ? contentDestinations : modulePath === "/admin/settings" ? settingsDestinations : group.label === "Reservations" ? adminGroups[1].items : group.label === "Monitoring" ? adminGroups[3].items : [];
  return { module: section, group: group.label, detail, preview, context };
}
