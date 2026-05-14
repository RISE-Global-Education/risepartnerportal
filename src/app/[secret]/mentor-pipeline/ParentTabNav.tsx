"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MentorParentTabNav({ secret }: { secret: string }) {
  const pathname = usePathname();

  const tabs = [
    { label: "Mentors", href: `/${secret}/mentor-pipeline/mentors` },
    { label: "Writing Coach", href: `/${secret}/mentor-pipeline/writing-coach` },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              active
                ? "bg-rise-green text-white"
                : "text-rise-brown hover:text-rise-black hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
