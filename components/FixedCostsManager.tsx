"use client";

import { useEffect, useState, type FormEvent } from "react";
import { loadFixedCosts, monthlyFixedTotal, type FixedCost } from "@/lib/fixedCosts";
import {
  MISSING_TABLES_MESSAGE,
  currentMonthStart,
  formatMoney,
  isMissingTable,
  monthName,
  parseAmount,
} from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/useHydrated";

export default function FixedCostsManager() {
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const hydrated = useHydrated();
  const month = currentMonthStart();
  const title = hydrated ? monthName() : "This month";

  useEffect(() => {
    loadFixedCosts(createClient(), currentMonthStart()).then(({ error, costs }) => {
      if (error) setError(isMissingTable(error) ? MISSING_TABLES_MESSAGE : error.message);
      else setCosts(costs);
      setLoading(false);
    });
  }, []);

  function update(id: string, patch: Partial<FixedCost>) {
    setCosts((current) => current.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function addCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseAmount(amount);
    const { data, error } = await createClient()
      .from("fixed_costs")
      .insert({ name: name.trim(), amount: value })
      .select("id, name, amount, active")
      .single();
    if (error) {
      setError(isMissingTable(error) ? MISSING_TABLES_MESSAGE : error.message);
      return;
    }
    setCosts((current) => [
      ...current,
      { ...data, amount: Number(data.amount), monthAmount: Number(data.amount), overridden: false },
    ]);
    setName("");
    setAmount("");
    setError(null);
  }

  async function saveUsual(cost: FixedCost, input: string) {
    const value = parseAmount(input);
    if (value === cost.amount) return;
    const { error } = await createClient().from("fixed_costs").update({ amount: value }).eq("id", cost.id);
    if (error) return setError(error.message);
    update(cost.id, { amount: value, monthAmount: cost.overridden ? cost.monthAmount : value });
  }

  async function saveThisMonth(cost: FixedCost, input: string) {
    const value = parseAmount(input);
    if (value === cost.monthAmount) return;
    const { error } = await createClient()
      .from("fixed_cost_overrides")
      .upsert({ fixed_cost_id: cost.id, month, amount: value });
    if (error) return setError(error.message);
    update(cost.id, { monthAmount: value, overridden: true });
  }

  async function resetThisMonth(cost: FixedCost) {
    const { error } = await createClient()
      .from("fixed_cost_overrides")
      .delete()
      .eq("fixed_cost_id", cost.id)
      .eq("month", month);
    if (error) return setError(error.message);
    update(cost.id, { monthAmount: cost.amount, overridden: false });
  }

  async function toggleActive(cost: FixedCost) {
    const { error } = await createClient()
      .from("fixed_costs")
      .update({ active: !cost.active })
      .eq("id", cost.id);
    if (error) return setError(error.message);
    update(cost.id, { active: !cost.active });
  }

  async function remove(cost: FixedCost) {
    const { error } = await createClient().from("fixed_costs").delete().eq("id", cost.id);
    if (error) return setError(error.message);
    setCosts((current) => current.filter((c) => c.id !== cost.id));
  }

  return (
    <div className="tracker">
      <div className="tracker-head">
        <h1>Fixed costs</h1>
        <p className="muted small">
          Things you pay every month, like phone data or a gym membership. They&apos;re taken off
          your allowance automatically at the start of each month.
        </p>
      </div>

      <section className="card">
        <h2>Add a fixed cost</h2>
        <form onSubmit={addCost} className="form spending-form">
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              placeholder="e.g. Phone data"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Every month (€)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="30.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button type="submit" className="button field-wide" disabled={!hydrated}>
            Add fixed cost
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
          <h2>{title}</h2>
          <strong>{formatMoney(monthlyFixedTotal(costs))}</strong>
        </div>
        {loading ? (
          <p className="muted small">Loading…</p>
        ) : costs.length === 0 ? (
          <p className="muted small">No fixed costs yet.</p>
        ) : (
          <ul className="items">
            {costs.map((cost) => (
              <li key={cost.id} className={`item item-stacked${cost.active ? "" : " item-paused"}`}>
                <div className="row-between">
                  <span className="item-text">
                    {cost.name}
                    {!cost.active && <span className="tag tag-muted">Paused</span>}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Delete ${cost.name}`}
                    onClick={() => remove(cost)}
                  >
                    ×
                  </button>
                </div>
                <div className="cost-fields">
                  <label className="field">
                    <span>Every month (€)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      defaultValue={cost.amount}
                      onBlur={(e) => saveUsual(cost, e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>This month only (€)</span>
                    <input
                      key={`${cost.id}-${cost.monthAmount}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      defaultValue={cost.monthAmount}
                      onBlur={(e) => saveThisMonth(cost, e.target.value)}
                      disabled={!cost.active}
                    />
                  </label>
                </div>
                <div className="item-actions small">
                  <label className="check">
                    <input type="checkbox" checked={cost.active} onChange={() => toggleActive(cost)} />
                    Active
                  </label>
                  {cost.overridden && (
                    <button type="button" className="link-button" onClick={() => resetThisMonth(cost)}>
                      Use the usual {formatMoney(cost.amount)} this month
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
