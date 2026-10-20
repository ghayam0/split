import type { Metadata } from "next";
import SavingsManager from "@/components/SavingsManager";

export const metadata: Metadata = { title: "Savings — Split" };

export default function SavingsPage() {
  return <SavingsManager />;
}
