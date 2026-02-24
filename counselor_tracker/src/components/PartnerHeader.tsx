import Image from "next/image";
import type { Counselor } from "@/lib/types";

export default function PartnerHeader({ counselor }: { counselor: Counselor }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
      <div className="flex items-center gap-6 mb-6">
        <Image
          src="/rise-logo.png"
          alt="RISE Logo"
          width={60}
          height={60}
          className="object-contain"
        />
        <div>
          <h1 className="text-3xl font-bold text-rise-black font-heading">
            {counselor.companyName}
          </h1>
          <p className="text-rise-brown mt-1">Partner Portal</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-rise-brown">RISE Point of Contact</span>
          <p className="font-medium text-rise-black mt-1">
            {counselor.poc.length > 0 ? counselor.poc.join(", ") : "—"}
          </p>
        </div>
        <div>
          <span className="text-rise-brown">Capacity</span>
          <p className="font-medium text-rise-black mt-1">
            {counselor.capacity || "—"}
          </p>
        </div>
        <div>
          <span className="text-rise-brown">Partnership Status</span>
          <p className="font-medium text-rise-black mt-1">
            {counselor.followUpStatus || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
