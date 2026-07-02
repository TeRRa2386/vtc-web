import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vet Tech Companion",
    template: "%s | Vet Tech Companion"
  },
  description: "Public website and admin operations dashboard for Vet Tech Companion."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
