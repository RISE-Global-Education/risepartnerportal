import Image from "next/image";

export default function PartnerLoginGate({
  slug,
  companyName,
  href,
}: {
  slug: string;
  companyName: string;
  href?: string;
}) {
  return (
    <div className="min-h-screen bg-rise-cream">
      <div className="bg-rise-green h-1.5" />
      <div className="max-w-md mx-auto px-4 py-24">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Image
            src="/rise-logo.png"
            alt="RISE Logo"
            width={60}
            height={60}
            className="object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-rise-black font-heading">{companyName}</h1>
          <p className="text-rise-brown mt-1 mb-6">Partner Portal</p>
          <p className="text-sm text-gray-500 mb-6">
            This page is password-protected. Log in to view your partner dashboard.
          </p>
          <a
            href={href ?? `/partner/${slug}/login`}
            className="inline-block bg-rise-green text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-rise-green/90 transition-colors"
          >
            Secure Login
          </a>
        </div>
      </div>
    </div>
  );
}
