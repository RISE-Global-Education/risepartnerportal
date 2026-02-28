"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ secret }: { secret: string }) {
  const pathname = usePathname();
  const basePath = `/dashboard/${secret}`;
  const isSearch = pathname.endsWith("/search");
  const isInsights = pathname.includes("/insights");

  const tabs = [
    { label: "Dashboard", href: basePath, active: !isSearch && !isInsights },
    { label: "Search", href: `${basePath}/search`, active: isSearch },
    { label: "Insights", href: `${basePath}/insights/mixmax`, active: isInsights },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-8">
        <Link href={basePath} className="flex items-center gap-2 shrink-0">
          <Image
            src="/rise-logo.png"
            alt="RISE Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="font-heading font-bold text-rise-black text-sm hidden sm:inline">
            RISE
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                tab.active
                  ? "bg-rise-green/10 text-rise-green"
                  : "text-rise-brown hover:text-rise-black hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
