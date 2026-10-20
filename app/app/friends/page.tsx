import type { Metadata } from "next";
import DebtsManager from "@/components/DebtsManager";

export const metadata: Metadata = { title: "Friends — Split" };

export default function FriendsPage() {
  return <DebtsManager />;
}
