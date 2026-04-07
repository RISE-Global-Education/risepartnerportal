"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ secret, role }: { secret: string; role: "admin" | "user" }) {
  const pathname = usePathname();
  const basePath = `/${secret}`;
  const isSearch = pathname.endsWith("/search");
  const isInsights = pathname.includes("/insights");
  const isPipeline = pathname.includes("/student-pipeline");
  const isCalendar = pathname.includes("/calendar-bookings");
  const isDashboard = pathname.includes("/dashboard") && !isSearch && !isInsights && !isPipeline && !isCalendar;

  const allTabs = [
    { label: "Dashboard", href: `${basePath}/dashboard`, active: isDashboard, adminOnly: true },
    { label: "Search", href: `${basePath}/search`, active: isSearch, adminOnly: true },
    { label: "Student Pipeline", href: `${basePath}/student-pipeline`, active: isPipeline, adminOnly: false },
    { label: "Insights", href: `${basePath}/insights/mixmax`, active: isInsights, adminOnly: true },
    { label: "Calendar Bookings", href: `${basePath}/calendar-bookings`, active: isCalendar, adminOnly: true },
  ];

  const tabs = role === "admin" ? allTabs : allTabs.filter((t) => !t.adminOnly);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-8">
        <Link href={`${basePath}/dashboard`} className="flex items-center gap-2 shrink-0">
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
