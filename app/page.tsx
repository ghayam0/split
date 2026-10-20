import Link from "next/link";

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
