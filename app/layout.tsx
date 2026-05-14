import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { LeadsProvider } from "@/context/leads-context";
import { CampaignsProvider } from "@/context/campaigns-context";

const fontDashboard = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-dashboard",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Select Surplus — Lead Finder & Outreach",
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
        <LeadsProvider>
          <CampaignsProvider>{children}</CampaignsProvider>
        </LeadsProvider>
      </body>
    </html>
  );
}
