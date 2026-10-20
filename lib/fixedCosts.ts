import type { SupabaseClient } from "@supabase/supabase-js";

export type FixedCost = {
  id: string;
  name: string;
  amount: number;
  active: boolean;
  // What this cost takes from the given month: the override if there is one, else the usual amount.
  monthAmount: number;
  overridden: boolean;
};

export async function loadFixedCosts(supabase: SupabaseClient, month: string) {
  const [costs, overrides] = await Promise.all([
    supabase.from("fixed_costs").select("id, name, amount, active").order("created_at"),
    supabase.from("fixed_cost_overrides").select("fixed_cost_id, amount").eq("month", month),
  ]);

  const error = costs.error ?? overrides.error;
  if (error) return { error, costs: [] as FixedCost[] };

  const byCost = new Map(
    (overrides.data ?? []).map((o) => [o.fixed_cost_id as string, Number(o.amount)]),
  );

  return {
    error: null,
    costs: (costs.data ?? []).map((c) => {
      const override = byCost.get(c.id);
      return {
        id: c.id,
        name: c.name,
        amount: Number(c.amount),
        active: c.active,
        monthAmount: override ?? Number(c.amount),
        overridden: override !== undefined,
      };
    }),
  };
}

export function monthlyFixedTotal(costs: FixedCost[]) {
  return costs.filter((c) => c.active).reduce((sum, c) => sum + c.monthAmount, 0);
}
