import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fontDashboard = Montserrat({
  subsets: ["latin"],
  variable: "--font-dashboard",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Select Surplus LLC — Leads & email",
  description: "Find companies, manage leads, and send outbound email.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={fontDashboard.variable}>
      <body>{children}</body>
    </html>
  );
}
