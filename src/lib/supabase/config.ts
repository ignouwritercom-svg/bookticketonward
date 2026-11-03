export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const otpLength = Number(process.env.NEXT_PUBLIC_SUPABASE_OTP_LENGTH || 6);
  if (
    !url ||
    !key ||
    !Number.isInteger(otpLength) ||
    otpLength < 6 ||
    otpLength > 10
  )
    return null;
  try {
    if (!["http:", "https:"].includes(new URL(url).protocol)) return null;
  } catch {
    return null;
  }
  return { url, key, otpLength };
}
