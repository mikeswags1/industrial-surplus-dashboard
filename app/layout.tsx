import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { LeadsProvider } from "@/context/leads-context";

const fontDashboard = Montserrat({
  subsets: ["latin"],
  variable: "--font-dashboard",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Select Surplus LLC — Lead Finder & Outreach",
  description:
    "Find surplus holders, save leads, send cold emails, and track replies in one workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={fontDashboard.variable}>
      <body>
        <LeadsProvider>{children}</LeadsProvider>
      </body>
    </html>
  );
}
