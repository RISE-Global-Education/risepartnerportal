import Image from "next/image";
import { getAllCounselors, getContactsForCounselor } from "@/lib/counselors";
import SearchBar from "@/components/SearchBar";
import AddPartnerForm from "@/components/AddPartnerForm";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const counselors = await getAllCounselors();

  const contactsPerCounselor = await Promise.all(
    counselors.map((c) => getContactsForCounselor(c.pocRecordIds))
  );

  const counselorOptions = counselors.map((c, i) => ({
    companyName: c.companyName,
    slug: c.slug,
    counselorId: c.counselorId,
    email: c.email,
    contacts: contactsPerCounselor[i].map((contact) => ({
      name: contact.name,
      email: contact.email,
    })),
  }));

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20">
      <div className="text-center mb-10">
        <Image
          src="/rise-logo.png"
          alt="RISE Logo"
          width={80}
          height={80}
          className="mx-auto mb-6 object-contain"
        />
        <h1 className="text-3xl font-bold text-rise-black font-heading">
          Partner Dashboard
        </h1>
        <p className="text-rise-brown mt-2">
          Search for a counselor partner to view their pipeline.
        </p>
      </div>
      <SearchBar counselors={counselorOptions} />
      <AddPartnerForm secret={secret} />
    </div>
  );
}
