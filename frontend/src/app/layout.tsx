import type { Metadata } from "next";
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AppHydrator } from "@/components/AppHydrator";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description: `Connect with trusted local vendors, bargain smarter, and enjoy fresh products delivered to your doorstep with ${BRAND_NAME}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppHydrator />
        <Toaster position="top-center" reverseOrder={false} />
        {children}
      </body>
    </html>
  );
}
