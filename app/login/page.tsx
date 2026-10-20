import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in — Split" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
