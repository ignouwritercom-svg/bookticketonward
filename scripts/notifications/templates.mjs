// Pure rendering shared by the server worker and isolated tests, never a mail endpoint.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const descriptions = {
  booking_saved: ['Booking saved', 'Your order was saved awaiting payment. This is not a payment confirmation. Fulfilment and the delivery timer have not started.'],
  processing: ['Processing started', 'Processing started after the paid-order check. Sign in for the current order status.'],
  document_ready: ['Document published', 'A reservation document was published to your account. Your order may need additional document types. Sign in to check current availability.'],
  document_replaced: ['Updated document published', 'An updated reservation document was published after an earlier version was withdrawn. Use the current documents shown in your account.'],
  document_withdrawn: ['Document withdrawn', 'A previously published document was withdrawn and is no longer available for download. Check your account for current documents and updates.'],
};
export function renderNotification(payload, origin) {
  const description = descriptions[payload.event];
  if (!description || !/^[A-Z0-9-]{1,64}$/i.test(payload.reference) || !/^[0-9a-f-]{36}$/i.test(payload.order_id)) throw new Error('Invalid notification');
  const url = new URL(`/account/orders/${payload.order_id}`, origin).href;
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload.amount_minor / 100);
  if (!Number.isSafeInteger(payload.amount_minor) || payload.amount_minor < 0 || payload.currency !== 'INR') throw new Error('Invalid amount');
  const lines = [description[1], `Order: ${payload.reference}`, `Event recorded: ${new Date(payload.occurred_at).toISOString()}`];
  if (payload.event === 'booking_saved') {
    lines.push(payload.payment_status === 'awaiting_payment' ? `Awaiting payment. Amount due: ${amount}.` : `Order service fee: ${amount}. Payment status has since changed; check your account. This email is not a payment confirmation.`);
    lines.push(...payload.summary.map(line => String(line).slice(0, 320)));
  }
  lines.push('This account update goes to your verified sign-in email, separately from your selected email or WhatsApp document-delivery preference.', 'Availability can change after this event. Sign in to view your current order. No private PDF is attached.', url);
  return { subject: `${description[0]} | ${payload.reference}`, text: lines.join('\n\n'), html: `<main><h1>${escapeHtml(description[0])}</h1>${lines.slice(0,-1).map(line => `<p>${escapeHtml(line)}</p>`).join('')}<p><a href="${escapeHtml(url)}">View your authenticated order</a></p></main>` };
}
