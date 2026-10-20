"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/useHydrated";

type Mode = "signup" | "login";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    if (!data.session) {
      // Only happens if "Confirm email" is still switched on in Supabase.
      setError("Your account was created, but Supabase is asking for email confirmation. Turn it off in the Supabase dashboard.");
      setPending(false);
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="muted">
        {isSignup
          ? "Start tracking your allowance in under a minute."
          : "Log in to see where your allowance is going."}
      </p>

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid={`${mode}-email`}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid={`${mode}-password`}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="button button-full"
          disabled={pending || !hydrated}
          data-testid={`${mode}-submit`}
        >
          {pending ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <p className="muted small">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New to Split? <Link href="/signup">Sign up</Link>
          </>
        )}
      </p>
    </div>
  );
}
