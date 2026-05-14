import { getAllCounselors } from "@/lib/counselors";
import SearchBar from "@/components/SearchBar";
import AddPartnerForm from "@/components/AddPartnerForm";

export default async function PartnersSearchPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const counselors = await getAllCounselors();

  const counselorOptions = counselors.map((c) => ({
    companyName: c.companyName,
    slug: c.slug,
    counselorId: c.counselorId,
    pocNames: c.pocNames,
    pocEmails: c.pocEmails,
  }));

  return (
    <div className="flex flex-col items-center px-4 py-10">
      <SearchBar counselors={counselorOptions} />
      <AddPartnerForm secret={secret} />
    </div>
  );
}
