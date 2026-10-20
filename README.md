# Split

Split helps university students with an allowance categorize their spending so they understand how to allocate their allowance in future months.

Built with Next.js and Supabase (Auth + Postgres with Row Level Security).

## Run it locally

1. Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
2. In Supabase → SQL Editor, run `supabase/schema.sql`.
3. In Supabase → Authentication → Sign In / Providers → Email, turn off **Confirm email**.
4. `npm install`
5. `npm run dev` and open http://localhost:3000
