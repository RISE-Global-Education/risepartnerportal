"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MentorPipelineTabNav({ secret }: { secret: string }) {
  const pathname = usePathname();
  const base = `/${secret}/mentor-pipeline/mentors`;

  const tabs = [
    { label: "Mentor Interview", href: `${base}/mentor-interview` },
    { label: "Mentor Finder", href: `${base}/mentor-finder` },
  ];

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
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
