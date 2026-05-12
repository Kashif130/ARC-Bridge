import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Arc Bridge — Cross-chain USDC Transfer",
  description: "Bridge USDC across blockchains using Circle's Arc network and CCTP protocol",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="animated-gradient noise min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
