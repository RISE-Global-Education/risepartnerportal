"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ShortlistingSubNav({ secret }: { secret: string }) {
  const pathname = usePathname();
  const base = `/${secret}/student-pipeline/shortlisting`;

  const tabs = [
    { label: "Interview Not Booked", href: `${base}/interview-not-booked` },
  ];

  return (
    <div className="flex gap-1 mt-4 border-b border-gray-100">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-rise-brown text-rise-brown"
                : "border-transparent text-gray-400 hover:text-rise-black hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
