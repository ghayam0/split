import Link from "next/link";
import CategoryDonut from "@/components/CategoryDonut";
import { categoryColor, type Category } from "@/lib/categories";

const EXAMPLE: { category: Category; total: number }[] = [
  { category: "Food", total: 180 },
  { category: "Going out", total: 95 },
  { category: "Transport", total: 60 },
  { category: "Study", total: 40 },
  { category: "Other", total: 25 },
];

const EXAMPLE_TOTAL = EXAMPLE.reduce((sum, s) => sum + s.total, 0);


export default function LandingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">For university students living on an allowance</p>
        <h1>See where your allowance goes, and plan next month better.</h1>
        <p className="lead">
          Split lets you log each spending with a category (food, transport, going out…) and
          shows you how your money is divided, so you know how to allocate your allowance in the
          months ahead.
        </p>
        <Link href="/signup" className="button button-large">
          Sign up — it&apos;s free
        </Link>
        <p className="muted small">
          Already using Split? <Link href="/login">Log in</Link>
        </p>

        <div className="hero-preview" aria-label="Example of a monthly split">
          <p className="hero-preview-title">Example: a student&apos;s month</p>
          <div className="split-view">
            <CategoryDonut slices={EXAMPLE} decimals={0} label="spent" />
            <ul className="breakdown">
              {EXAMPLE.map((s) => (
                <li key={s.category} className="row-between small">
                  <span>
                    <span className="swatch" style={{ background: categoryColor(s.category) }} />
                    {s.category}
                  </span>
                  <span>{Math.round((s.total / EXAMPLE_TOTAL) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="steps" aria-label="How it works">
        <div className="step">
          <span className="step-number">1</span>
          <h2>Log a spending</h2>
          <p>Write what you bought, the amount, and pick a category. Takes five seconds.</p>
        </div>
        <div className="step">
          <span className="step-number">2</span>
          <h2>See your split</h2>
          <p>Split totals each category so you can see what eats most of your allowance.</p>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <h2>Plan next month</h2>
          <p>Use what you learned to set aside the right amount for each category.</p>
        </div>
      </section>

      <p className="muted small center">Your spending is private: only you can see it.</p>
    </div>
  );
}
