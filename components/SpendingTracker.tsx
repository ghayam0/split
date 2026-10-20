"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import BudgetOverview from "@/components/BudgetOverview";
import CategoryDonut from "@/components/CategoryDonut";
import { CATEGORIES, DEFAULT_CATEGORY, categoryColor, type Category } from "@/lib/categories";
import {
  CURRENCIES,
  HOME_CURRENCY,
  formatMoney,
  getRateToEuro,
  isThisMonth,
  parseAmount,
  type Currency,
} from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/useHydrated";

type Spending = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  created_at: string;
  original_amount?: number | null;
  original_currency?: string | null;
};

const money = { format: (value: number) => formatMoney(value) };

// Rows come back with select("*") so the list still loads before the currency columns exist.
function toSpending(row: Record<string, unknown>): Spending {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: Number(row.amount),
    category: row.category as Category,
    created_at: row.created_at as string,
    original_amount: row.original_amount == null ? null : Number(row.original_amount),
    original_currency: (row.original_currency as string | null) ?? null,
  };
}

export default function SpendingTracker({ email, userId }: { email: string; userId: string }) {
  const [items, setItems] = useState<Spending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [currency, setCurrency] = useState<Currency>(HOME_CURRENCY);
  const [rate, setRate] = useState<{ currency: string; value: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    createClient()
      .from("spendings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems((data ?? []).map(toSpending));
        setLoading(false);
      });
  }, []);

  // Preview the conversion as soon as a foreign currency is picked.
  useEffect(() => {
    if (currency === HOME_CURRENCY) return;
    let cancelled = false;
    getRateToEuro(currency)
      .then((value) => !cancelled && setRate({ currency, value }))
      .catch(() => !cancelled && setRate(null));
    return () => {
      cancelled = true;
    };
  }, [currency]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = description.trim();
    if (!text) return;

    setSaving(true);
    setError(null);

    const paid = parseAmount(amount);
    const row: Record<string, unknown> = { description: text, amount: paid, category };

    if (currency !== HOME_CURRENCY) {
      try {
        const exchange = await getRateToEuro(currency);
        Object.assign(row, {
          amount: Math.round(paid * exchange * 100) / 100,
          original_amount: paid,
          original_currency: currency,
          exchange_rate: exchange,
        });
      } catch (err) {
        setSaving(false);
        setError((err as Error).message);
        return;
      }
    }

    const { data, error } = await createClient().from("spendings").insert(row).select("*").single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setItems((current) => [toSpending(data), ...current]);
    setDescription("");
    setAmount("");
  }

  async function handleDelete(id: string) {
    const { error } = await createClient().from("spendings").delete().eq("id", id);
    if (error) setError(error.message);
    else setItems((current) => current.filter((item) => item.id !== id));
  }

  const thisMonth = useMemo(() => items.filter((item) => isThisMonth(item.created_at)), [items]);

  const monthTotal = thisMonth.reduce((sum, item) => sum + item.amount, 0);

  const byCategory = useMemo(() => {
    const totals = new Map<Category, number>();
    for (const item of thisMonth) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [thisMonth]);

  return (
    <div className="tracker">
      <div className="tracker-head">
        <h1>My spending</h1>
        {email && <p className="muted small">Logged in as {email}</p>}
      </div>

      <BudgetOverview userId={userId} spent={monthTotal} />

      <section className="card">
        <h2>Add a spending</h2>
        <form onSubmit={handleSubmit} className="form spending-form">
          <label className="field field-wide">
            <span>What did you spend on?</span>
            <input
              type="text"
              placeholder="e.g. Lunch with friends"
              required
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="core-input"
            />
          </label>

          <div className="field">
            <label htmlFor="spending-amount">Amount</label>
            <div className="amount-group">
              <input
                id="spending-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {currency !== HOME_CURRENCY && (
              <span className="muted small hint">
                {rate?.currency === currency
                  ? `≈ ${formatMoney(parseAmount(amount) * rate.value)} at today's rate (1 ${currency} = ${formatMoney(rate.value)})`
                  : "Getting today's rate…"}
              </span>
            )}
          </div>

          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="button field-wide"
            disabled={saving || !hydrated}
            data-testid="core-submit"
          >
            {saving ? "Saving…" : "Add spending"}
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="card bank-card">
        <div>
          <h2>Connect your bank</h2>
          <p className="muted small">
            Soon Split will be able to add your card payments automatically, so you won&apos;t have
            to log each one by hand.
          </p>
        </div>
        <button type="button" className="button button-ghost" disabled aria-disabled="true">
          Coming soon
        </button>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>This month</h2>
          <strong>{money.format(monthTotal)}</strong>
        </div>
        {byCategory.length === 0 ? (
          <p className="muted small">Add a spending to see how your allowance is split.</p>
        ) : (
          <div className="split-view">
            <CategoryDonut
              slices={byCategory.map(([category, total]) => ({ category, total }))}
            />
            <ul className="breakdown">
              {byCategory.map(([cat, total]) => {
                const pct = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;
                return (
                  <li key={cat}>
                    <div className="row-between small">
                      <span>
                        <span className="swatch" style={{ background: categoryColor(cat) }} />
                        {cat}
                      </span>
                      <span>
                        {money.format(total)} · {pct}%
                      </span>
                    </div>
                    <div className="bar" aria-hidden="true">
                      <div
                        className="bar-fill"
                        style={{ width: `${pct}%`, background: categoryColor(cat) }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <h2>All spendings</h2>
        {loading ? (
          <p className="muted small">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted small">Nothing yet. Your first spending will show up here.</p>
        ) : (
          <ul className="items">
            {items.map((item) => (
              <li key={item.id} className="item" data-testid="core-item">
                <div className="item-main">
                  <span className="item-text">{item.description}</span>
                  <span className="item-meta">
                    <span className="tag">
                      <span className="swatch" style={{ background: categoryColor(item.category) }} />
                      {item.category}
                    </span>
                    {new Date(item.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="item-side">
                  <span className="item-amount">
                    {money.format(item.amount)}
                    {item.original_currency && item.original_amount != null && (
                      <span className="item-original">
                        {formatMoney(item.original_amount, item.original_currency)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Delete ${item.description}`}
                    onClick={() => handleDelete(item.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
