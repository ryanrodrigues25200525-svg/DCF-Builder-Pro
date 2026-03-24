
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DCF Builder | Financial Modeling Automation",
  description: "Instant DCF models for any US public company.",
};

import { QueryProvider } from "@/components/providers/QueryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased font-sans"
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
