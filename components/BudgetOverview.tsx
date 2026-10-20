"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { loadFixedCosts, monthlyFixedTotal } from "@/lib/fixedCosts";
import {
  MISSING_TABLES_MESSAGE,
  currentMonthStart,
  currentMonthStartIso,
  formatMoney,
  isMissingTable,
  monthName,
  parseAmount,
} from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/useHydrated";

type Totals = { allowance: number; fixed: number; saved: number };

export default function BudgetOverview({ userId, spent }: { userId: string; spent: number }) {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // The server may be in another timezone, so name the month only once we're in the browser.
  const title = `${useHydrated() ? monthName() : "This month's"} budget`;

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("budgets").select("monthly_allowance").maybeSingle(),
      loadFixedCosts(supabase, currentMonthStart()),
      supabase.from("savings_deposits").select("amount").gte("created_at", currentMonthStartIso()),
    ]).then(([budget, fixed, deposits]) => {
      const failed = budget.error ?? fixed.error ?? deposits.error;
      if (failed) {
        setError(isMissingTable(failed) ? MISSING_TABLES_MESSAGE : failed.message);
        return;
      }
      setTotals({
        allowance: Number(budget.data?.monthly_allowance ?? 0),
        fixed: monthlyFixedTotal(fixed.costs),
        saved: (deposits.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0),
      });
    });
  }, []);

  async function saveAllowance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const allowance = parseAmount(draft);
    const { error } = await createClient()
      .from("budgets")
      .upsert({ user_id: userId, monthly_allowance: allowance, updated_at: new Date().toISOString() });
    if (error) {
      setError(error.message);
      return;
    }
    setTotals((t) => (t ? { ...t, allowance } : t));
    setEditing(false);
  }

  if (error) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p className="muted small">{error}</p>
      </section>
    );
  }

  if (!totals) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p className="muted small">Loading…</p>
      </section>
    );
  }

  const left = totals.allowance - totals.fixed - spent - Math.max(totals.saved, 0);
  const parts = [
    { key: "fixed", label: "Fixed costs", value: totals.fixed, color: "var(--cat-1)" },
    { key: "spent", label: "Spent", value: spent, color: "var(--cat-2)" },
    { key: "saved", label: "Saved", value: Math.max(totals.saved, 0), color: "var(--cat-4)" },
    { key: "left", label: "Left", value: Math.max(left, 0), color: "var(--accent)" },
  ];
  const scale = Math.max(totals.allowance, totals.fixed + spent + Math.max(totals.saved, 0), 1);

  const allowanceForm = (
    <form onSubmit={saveAllowance} className="inline-form">
      <label className="field">
        <span>Monthly allowance (€)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button type="submit" className="button button-small">
        Save
      </button>
      {totals.allowance > 0 && (
        <button type="button" className="button button-small button-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
    </form>
  );

  if (totals.allowance === 0 && !editing) {
    return (
      <section className="card budget-card">
        <h2>{title}</h2>
        <p className="muted small">
          Set your monthly allowance and Split will subtract your fixed costs, spending and
          savings from it, so you always know what&apos;s left.
        </p>
        {allowanceForm}
      </section>
    );
  }

  return (
    <section className="card budget-card">
      <div className="row-between">
        <h2>{title}</h2>
        {!editing && (
          <button
            type="button"
            className="link-button small"
            onClick={() => {
              setDraft(String(totals.allowance));
              setEditing(true);
            }}
          >
            Edit allowance
          </button>
        )}
      </div>

      {editing ? (
        allowanceForm
      ) : (
        <>
          <p className="budget-left">
            <span className={left < 0 ? "over" : undefined}>{formatMoney(left)}</span>
            <span className="muted small">
              {left < 0 ? "over your allowance" : "left"} of {formatMoney(totals.allowance)}
            </span>
          </p>

          <div className="stack-bar" role="img" aria-label={parts.map((p) => `${p.label} ${formatMoney(p.value)}`).join(", ")}>
            {parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <div
                  key={p.key}
                  className="stack-bar-part"
                  style={{ width: `${(p.value / scale) * 100}%`, background: p.color }}
                  title={`${p.label}: ${formatMoney(p.value)}`}
                />
              ))}
          </div>

          <ul className="legend">
            {parts.map((p) => (
              <li key={p.key}>
                <span className="swatch" style={{ background: p.color }} />
                {p.label} <strong>{formatMoney(p.value)}</strong>
              </li>
            ))}
          </ul>

          {left < 0 && (
            <p className="warning small" role="status">
              You&apos;ve gone over this month&apos;s allowance by {formatMoney(-left)}.
            </p>
          )}
          <p className="muted small">
            <Link href="/app/fixed-costs">Fixed costs</Link> are taken off automatically at the start of each
            month.
          </p>
        </>
      )}
    </section>
  );
}
