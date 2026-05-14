"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubTabNav({ secret, isAdmin }: { secret: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const base = `/${secret}/calendar-bookings`;

  const tabs = [
    ...(isAdmin ? [{ label: "Discovery Call", href: `${base}/discovery-call` }] : []),
    { label: "Student Interviews", href: `${base}/student-interviews` },
    { label: "Mentor Interviews", href: `${base}/mentor-interviews` },
  ];

  return (
    <div className="flex gap-1 mt-3 border-b border-gray-200">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-rise-green text-rise-green"
                : "border-transparent text-rise-brown hover:text-rise-black hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
