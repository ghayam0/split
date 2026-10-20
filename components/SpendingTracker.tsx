"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CATEGORIES, DEFAULT_CATEGORY, type Category } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";

type Spending = {
  id: string;
  description: string;
  amount: number;
  category: Category;
  created_at: string;
};

const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export default function SpendingTracker({ email }: { email: string }) {
  const [items, setItems] = useState<Spending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .from("spendings")
      .select("id, description, amount, category, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems((data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })));
        setLoading(false);
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = description.trim();
    if (!text) return;

    setSaving(true);
    setError(null);

    const parsed = Number.parseFloat(amount.replace(",", "."));
    const { data, error } = await createClient()
      .from("spendings")
      .insert({
        description: text,
        amount: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
        category,
      })
      .select("id, description, amount, category, created_at")
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setItems((current) => [{ ...data, amount: Number(data.amount) }, ...current]);
    setDescription("");
    setAmount("");
  }

  async function handleDelete(id: string) {
    const { error } = await createClient().from("spendings").delete().eq("id", id);
    if (error) setError(error.message);
    else setItems((current) => current.filter((item) => item.id !== id));
  }

  const thisMonth = useMemo(() => {
    const now = new Date();
    return items.filter((item) => {
      const d = new Date(item.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [items]);

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

          <label className="field">
            <span>Amount (€)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

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
            disabled={saving}
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

      <section className="card">
        <div className="row-between">
          <h2>This month</h2>
          <strong>{money.format(monthTotal)}</strong>
        </div>
        {byCategory.length === 0 ? (
          <p className="muted small">Add a spending to see how your allowance is split.</p>
        ) : (
          <ul className="breakdown">
            {byCategory.map(([cat, total]) => {
              const pct = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;
              return (
                <li key={cat}>
                  <div className="row-between small">
                    <span>{cat}</span>
                    <span>
                      {money.format(total)} · {pct}%
                    </span>
                  </div>
                  <div className="bar" aria-hidden="true">
                    <div className="bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
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
                    <span className="tag">{item.category}</span>
                    {new Date(item.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="item-side">
                  <span className="item-amount">{money.format(item.amount)}</span>
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
