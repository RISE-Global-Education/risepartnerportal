"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function NavBar({ secret, role, teamName, employeeTypes = [] }: { secret: string; role: "admin" | "user"; teamName?: string | null; employeeTypes?: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/${secret}`;
  const isPartners = pathname.includes("/partners");
  const isInsights = pathname.includes("/insights");
  const isMentorPipeline = pathname.includes("/mentor-pipeline");
  const isDashboard = pathname.includes("/dashboard") && !isPartners && !isInsights;

  const isMentorSuccess = role === "admin" || employeeTypes.includes("Mentor Success");

  const allTabs = [
    { label: "Dashboard", href: `${basePath}/dashboard`, active: isDashboard, adminOnly: true, show: true },
    { label: "Partners", href: `${basePath}/partners`, active: isPartners, adminOnly: true, show: true },
    { label: "Mentor Pipeline", href: `${basePath}/mentor-pipeline`, active: isMentorPipeline, adminOnly: false, show: isMentorSuccess },
    { label: "Insights", href: `${basePath}/insights/mixmax`, active: isInsights, adminOnly: true, show: true },
  ];

  const tabs = (role === "admin" ? allTabs : allTabs.filter((t) => !t.adminOnly)).filter((t) => t.show);

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

        {teamName && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rise-green/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-rise-green">
                  {teamName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-rise-black hidden sm:inline">
                {teamName}
              </span>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/team-logout", { method: "POST" });
                router.push(`/${secret}/login`);
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
