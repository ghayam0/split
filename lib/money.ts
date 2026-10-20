// All totals are kept in euros; foreign spendings are converted when they are saved.
export const HOME_CURRENCY = "EUR";

export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
  "MXN",
  "BRL",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "TRY",
  "CNY",
  "INR",
  "KRW",
  "SGD",
  "THB",
  "ZAR",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export function formatMoney(value: number, currency: string = HOME_CURRENCY) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(value);
}

export function parseAmount(input: string) {
  const parsed = Number.parseFloat(input.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

// Today's ECB rate from Frankfurter (free, no API key): how many euros one unit of `from` buys.
const rateCache = new Map<string, number>();

export async function getRateToEuro(from: string) {
  if (from === HOME_CURRENCY) return 1;
  const cached = rateCache.get(from);
  if (cached) return cached;

  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${HOME_CURRENCY}`,
  );
  if (!res.ok) throw new Error("Couldn't get today's exchange rate. Try again in a moment.");
  const data: { rates?: Record<string, number> } = await res.json();
  const rate = data.rates?.[HOME_CURRENCY];
  if (!rate) throw new Error(`No exchange rate available for ${from}.`);

  rateCache.set(from, rate);
  return rate;
}

// First day of the current month as YYYY-MM-01, in the user's own timezone.
export function currentMonthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function currentMonthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function isThisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function monthName() {
  return new Date().toLocaleDateString("en-GB", { month: "long" });
}

// Supabase returns an error with this code when a table hasn't been created yet.
export function isMissingTable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.code === "42703";
}

export const MISSING_TABLES_MESSAGE =
  "This feature needs the new Supabase tables. Run supabase/002_budget_features.sql in the Supabase SQL Editor.";
