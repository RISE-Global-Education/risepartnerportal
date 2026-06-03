import { getAllCounselors, getAllContactPhones } from "@/lib/counselors";
import SearchBar from "@/components/SearchBar";
import AddPartnerForm from "@/components/AddPartnerForm";

export default async function PartnersSearchPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const [counselors, phoneMap] = await Promise.all([
    getAllCounselors(),
    getAllContactPhones(),
  ]);

  const counselorOptions = counselors.map((c) => {
    const pocPhones = c.pocRecordIds.map((id) => phoneMap.get(id) ?? "").filter(Boolean);
    return {
      companyName: c.companyName,
      slug: c.slug,
      counselorId: c.counselorId,
      pocNames: c.pocNames,
      pocEmails: c.pocEmails,
      pocPhones,
      pocPhonesDigits: pocPhones.map((p) => p.replace(/\D/g, "")),
    };
  });

  return (
    <div className="flex flex-col items-center px-4 py-10">
      <SearchBar counselors={counselorOptions} />
      <AddPartnerForm secret={secret} />
    </div>
  );
}
