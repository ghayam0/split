"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MISSING_TABLES_MESSAGE, formatMoney, isMissingTable, parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/useHydrated";

type Direction = "i_owe" | "owed_to_me";

type Debt = {
  id: string;
  person: string;
  amount: number;
  direction: Direction;
  note: string;
  settled_at: string | null;
  created_at: string;
};

const COLUMNS = "id, person, amount, direction, note, settled_at, created_at";

export default function DebtsManager() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction>("i_owe");
  const [note, setNote] = useState("");
  const hydrated = useHydrated();

  useEffect(() => {
    createClient()
      .from("debts")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(isMissingTable(error) ? MISSING_TABLES_MESSAGE : error.message);
        else setDebts((data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })));
        setLoading(false);
      });
  }, []);

  async function addDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (value <= 0) return setError("Enter an amount greater than zero.");
    const { data, error } = await createClient()
      .from("debts")
      .insert({ person: person.trim(), amount: value, direction, note: note.trim() })
      .select(COLUMNS)
      .single();
    if (error) return setError(isMissingTable(error) ? MISSING_TABLES_MESSAGE : error.message);
    setDebts((current) => [{ ...data, amount: Number(data.amount) }, ...current]);
    setPerson("");
    setAmount("");
    setNote("");
    setError(null);
  }

  async function setSettled(debt: Debt, settled: boolean) {
    const settled_at = settled ? new Date().toISOString() : null;
    const { error } = await createClient().from("debts").update({ settled_at }).eq("id", debt.id);
    if (error) return setError(error.message);
    setDebts((current) => current.map((d) => (d.id === debt.id ? { ...d, settled_at } : d)));
  }

  async function remove(debt: Debt) {
    const { error } = await createClient().from("debts").delete().eq("id", debt.id);
    if (error) return setError(error.message);
    setDebts((current) => current.filter((d) => d.id !== debt.id));
  }

  const open = debts.filter((d) => !d.settled_at);
  const settled = debts.filter((d) => d.settled_at);
  const iOwe = open.filter((d) => d.direction === "i_owe").reduce((sum, d) => sum + d.amount, 0);
  const owedToMe = open.filter((d) => d.direction === "owed_to_me").reduce((sum, d) => sum + d.amount, 0);

  function renderList(list: Debt[]) {
    return (
      <ul className="items">
        {list.map((debt) => (
          <li key={debt.id} className="item">
            <div className="item-main">
              <span className="item-text">
                {debt.direction === "i_owe" ? `You owe ${debt.person}` : `${debt.person} owes you`}
              </span>
              <span className="item-meta">
                {debt.note && <span>{debt.note}</span>}
                {new Date(debt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="item-side">
              <span className={`item-amount ${debt.direction === "i_owe" ? "owe" : "owed"}`}>
                {formatMoney(debt.amount)}
              </span>
              {debt.settled_at ? (
                <button type="button" className="link-button small" onClick={() => setSettled(debt, false)}>
                  Undo
                </button>
              ) : (
                <button type="button" className="button button-small button-ghost" onClick={() => setSettled(debt, true)}>
                  Settled
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete debt with ${debt.person}`}
                onClick={() => remove(debt)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="tracker">
      <div className="tracker-head">
        <h1>Friends</h1>
        <p className="muted small">Keep track of who you owe and who owes you, so nothing gets forgotten.</p>
      </div>

      <section className="card stat-row">
        <div>
          <span className="muted small">You owe</span>
          <strong className="stat owe">{formatMoney(iOwe)}</strong>
        </div>
        <div>
          <span className="muted small">Owed to you</span>
          <strong className="stat owed">{formatMoney(owedToMe)}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Add money owed</h2>
        <form onSubmit={addDebt} className="form spending-form">
          <label className="field">
            <span>Friend&apos;s name</span>
            <input
              type="text"
              placeholder="e.g. Sara"
              required
              maxLength={100}
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Amount (€)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="15.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Who owes who?</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              <option value="i_owe">I owe them</option>
              <option value="owed_to_me">They owe me</option>
            </select>
          </label>
          <label className="field">
            <span>What for? (optional)</span>
            <input
              type="text"
              placeholder="e.g. Concert tickets"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button type="submit" className="button field-wide" disabled={!hydrated}>
            Add
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Open</h2>
        {loading ? (
          <p className="muted small">Loading…</p>
        ) : open.length === 0 ? (
          <p className="muted small">All square. Nobody owes anybody.</p>
        ) : (
          renderList(open)
        )}
      </section>

      {settled.length > 0 && (
        <details className="card">
          <summary>
            <h2 className="inline-heading">Settled ({settled.length})</h2>
          </summary>
          {renderList(settled)}
        </details>
      )}
    </div>
  );
}
