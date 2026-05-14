import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LeadsProvider } from "@/context/leads-context";
import { CampaignsProvider } from "@/context/campaigns-context";

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
    <html lang="en">
      <body>
        <LeadsProvider>
          <CampaignsProvider>{children}</CampaignsProvider>
        </LeadsProvider>
      </body>
    </html>
  );
}
