"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      data-testid="logout"
      className="button button-small button-ghost"
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
