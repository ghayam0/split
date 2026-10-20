import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SpendingTracker from "@/components/SpendingTracker";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My spending — Split" };

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <SpendingTracker email={user.email} userId={user.id} />;
}
