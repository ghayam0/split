"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  MISSING_TABLES_MESSAGE,
  formatMoney,
  isMissingTable,
  isThisMonth,
  parseAmount,
} from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/useHydrated";

type Goal = { id: string; name: string; target_amount: number };
type Deposit = { id: string; goal_id: string; amount: number; created_at: string };

export default function SavingsManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const hydrated = useHydrated();

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("savings_goals").select("id, name, target_amount").order("created_at"),
      supabase.from("savings_deposits").select("id, goal_id, amount, created_at"),
    ]).then(([g, d]) => {
      const failed = g.error ?? d.error;
      if (failed) setError(isMissingTable(failed) ? MISSING_TABLES_MESSAGE : failed.message);
      else {
        setGoals((g.data ?? []).map((row) => ({ ...row, target_amount: Number(row.target_amount) })));
        setDeposits((d.data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })));
      }
      setLoading(false);
    });
  }, []);

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data, error } = await createClient()
      .from("savings_goals")
      .insert({ name: name.trim(), target_amount: parseAmount(target) })
      .select("id, name, target_amount")
      .single();
    if (error) return setError(isMissingTable(error) ? MISSING_TABLES_MESSAGE : error.message);
    setGoals((current) => [...current, { ...data, target_amount: Number(data.target_amount) }]);
    setName("");
    setTarget("");
    setError(null);
  }

  async function move(goal: Goal, sign: 1 | -1) {
    const value = parseAmount(amounts[goal.id] ?? "");
    if (value <= 0) return;
    if (sign < 0 && value > savedFor(goal.id)) {
      return setError(`You only have ${formatMoney(savedFor(goal.id))} in ${goal.name}.`);
    }
    const { data, error } = await createClient()
      .from("savings_deposits")
      .insert({ goal_id: goal.id, amount: sign * value })
      .select("id, goal_id, amount, created_at")
      .single();
    if (error) return setError(error.message);
    setDeposits((current) => [...current, { ...data, amount: Number(data.amount) }]);
    setAmounts((current) => ({ ...current, [goal.id]: "" }));
  }

  async function removeGoal(goal: Goal) {
    const { error } = await createClient().from("savings_goals").delete().eq("id", goal.id);
    if (error) return setError(error.message);
    setGoals((current) => current.filter((g) => g.id !== goal.id));
    setDeposits((current) => current.filter((d) => d.goal_id !== goal.id));
  }

  const savedFor = (goalId: string) =>
    deposits.filter((d) => d.goal_id === goalId).reduce((sum, d) => sum + d.amount, 0);
  const totalSaved = deposits.reduce((sum, d) => sum + d.amount, 0);
  const savedThisMonth = deposits
    .filter((d) => isThisMonth(d.created_at))
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="tracker">
      <div className="tracker-head">
        <h1>Savings</h1>
        <p className="muted small">
          Put money aside for things you want. What you save this month is taken off this
          month&apos;s allowance.
        </p>
      </div>

      <section className="card stat-row">
        <div>
          <span className="muted small">Saved in total</span>
          <strong className="stat">{formatMoney(totalSaved)}</strong>
        </div>
        <div>
          <span className="muted small">Saved this month</span>
          <strong className="stat">{formatMoney(savedThisMonth)}</strong>
        </div>
      </section>

      <section className="card">
        <h2>New savings goal</h2>
        <form onSubmit={addGoal} className="form spending-form">
          <label className="field">
            <span>What are you saving for?</span>
            <input
              type="text"
              placeholder="e.g. Summer trip"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Target (€, optional)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="500.00"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <button type="submit" className="button field-wide" disabled={!hydrated}>
            Add goal
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {loading ? (
        <p className="muted small">Loading…</p>
      ) : goals.length === 0 ? (
        <p className="muted small center">No savings goals yet.</p>
      ) : (
        goals.map((goal) => {
          const saved = savedFor(goal.id);
          const pct = goal.target_amount > 0 ? Math.min(100, Math.round((saved / goal.target_amount) * 100)) : null;
          return (
            <section key={goal.id} className="card">
              <div className="row-between">
                <h2>{goal.name}</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Delete ${goal.name}`}
                  onClick={() => removeGoal(goal)}
                >
                  ×
                </button>
              </div>
              <p className="small">
                <strong>{formatMoney(saved)}</strong>
                {goal.target_amount > 0 && (
                  <span className="muted">
                    {" "}
                    of {formatMoney(goal.target_amount)} · {pct}%
                  </span>
                )}
              </p>
              {pct !== null && (
                <div className="bar" aria-hidden="true">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: "var(--cat-4)" }} />
                </div>
              )}
              <div className="inline-form">
                <label className="field">
                  <span>Amount (€)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="20.00"
                    value={amounts[goal.id] ?? ""}
                    onChange={(e) => setAmounts((current) => ({ ...current, [goal.id]: e.target.value }))}
                  />
                </label>
                <button type="button" className="button button-small" onClick={() => move(goal, 1)}>
                  Add
                </button>
                <button
                  type="button"
                  className="button button-small button-ghost"
                  onClick={() => move(goal, -1)}
                  disabled={saved <= 0}
                >
                  Take out
                </button>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
