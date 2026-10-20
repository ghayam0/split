import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Split — know where your allowance goes",
  description:
    "Split helps university students on an allowance categorize their spending so they can plan next month's budget.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <header className="site-header">
          <Link href={user ? "/app" : "/"} className="brand">
            <Logo />
            Split
          </Link>
          <nav className="nav">
            {user ? (
              <>
                <Link href="/app">My spending</Link>
                <LogoutButton />
              </>
            ) : (
              <Link href="/login">Log in</Link>
            )}
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
