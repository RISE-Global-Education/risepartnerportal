import type { Metadata } from "next";
import { Red_Hat_Display } from "next/font/google";
import { Suspense } from "react";
import NavigationProgress from "@/components/NavigationProgress";
import "./globals.css";

const redHatDisplay = Red_Hat_Display({
  variable: "--font-red-hat-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RISE Partner Portal",
  description: "RISE Global Education Partner Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${redHatDisplay.variable} antialiased`}>
        {/* useSearchParams inside needs a Suspense boundary */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
