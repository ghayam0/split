"use client";

import { useState } from "react";
import { categoryColor, type Category } from "@/lib/categories";

const RADIUS = 60;
const STROKE = 22;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 2;

type Slice = { category: Category; total: number };

export default function CategoryDonut({
  slices,
  decimals = 2,
  label = "this month",
}: {
  slices: Slice[];
  decimals?: number;
  label?: string;
}) {
  const format = (value: number) =>
    new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  const [active, setActive] = useState<Category | null>(null);
  const total = slices.reduce((sum, s) => sum + s.total, 0);
  const activeSlice = slices.find((s) => s.category === active);

  const visible = slices.filter((s) => s.total > 0);
  const gap = visible.length > 1 ? GAP : 0;
  const lengths = visible.map((s) => (total > 0 ? (s.total / total) * CIRC : 0));
  const segments = visible.map((slice, index) => {
    const start = lengths.slice(0, index).reduce((sum, l) => sum + l, 0);
    return {
      ...slice,
      index,
      dash: `${Math.max(lengths[index] - gap, 0.5)} ${CIRC}`,
      offset: -start,
      pct: Math.round((slice.total / total) * 100),
    };
  });

  return (
    <svg
      viewBox="0 0 160 160"
      className={`donut${active ? " has-active" : ""}`}
      role="img"
      aria-label={`Spending by category ${label}: ${segments
        .map((s) => `${s.category} ${format(s.total)} (${s.pct}%)`)
        .join(", ")}`}
      onMouseLeave={() => setActive(null)}
    >
      <circle cx="80" cy="80" r={RADIUS} fill="none" strokeWidth={STROKE} className="donut-track" />
      <g transform="rotate(-90 80 80)">
        {segments.map((s) => (
          <circle
            key={s.category}
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke={categoryColor(s.category)}
            strokeWidth={STROKE}
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
            className={`donut-segment${active === s.category ? " active" : ""}`}
            style={
              {
                "--circ": CIRC,
                "--delay": `${s.index * 0.08}s`,
              } as React.CSSProperties
            }
            tabIndex={0}
            onMouseEnter={() => setActive(s.category)}
            onFocus={() => setActive(s.category)}
            onBlur={() => setActive(null)}
          >
            <title>{`${s.category}: ${format(s.total)} (${s.pct}%)`}</title>
          </circle>
        ))}
      </g>
      <text x="80" y="78" textAnchor="middle" className="donut-center-value">
        {format(activeSlice ? activeSlice.total : total)}
      </text>
      <text x="80" y="96" textAnchor="middle" className="donut-center-label">
        {activeSlice ? activeSlice.category : label}
      </text>
    </svg>
  );
}
