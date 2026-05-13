import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LeadsProvider } from "@/context/leads-context";
import { CampaignsProvider } from "@/context/campaigns-context";

export const metadata: Metadata = {
  title: "Industrial Surplus — Marketing Dashboard",
  description:
    "Internal dashboard for lead discovery, outreach campaigns, and creative generation.",
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
