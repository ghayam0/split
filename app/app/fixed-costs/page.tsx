import type { Metadata } from "next";
import FixedCostsManager from "@/components/FixedCostsManager";

export const metadata: Metadata = { title: "Fixed costs — Split" };

export default function FixedCostsPage() {
  return <FixedCostsManager />;
}
