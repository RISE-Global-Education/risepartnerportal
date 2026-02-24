import { notFound } from "next/navigation";
import { getCounselorBySlug } from "@/lib/counselors";
import { getStudentsForCounselor, computeFunnelCounts } from "@/lib/students";
import { getConversationsForCounselor } from "@/lib/conversations";
import PartnerHeader from "@/components/PartnerHeader";
import FunnelStats from "@/components/FunnelStats";
import StudentTable from "@/components/StudentTable";
import ConversationLog from "@/components/ConversationLog";
import AddConversationForm from "@/components/AddConversationForm";
import CounselorDetails from "@/components/CounselorDetails";

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getCounselorBySlug(slug);

  if (!result) {
    notFound();
  }

  const { counselor, isCeoView } = result;
  const students = await getStudentsForCounselor(counselor.counselorId);
  const funnelCounts = computeFunnelCounts(students);
  const total = students.length;

  let conversations = undefined;
  if (isCeoView) {
    conversations = await getConversationsForCounselor(counselor.id);
  }

  return (
    <div className="min-h-screen bg-rise-cream">
      <div className="bg-rise-green h-1.5" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isCeoView && (
          <div className="mb-4 px-4 py-2 bg-rise-green/10 rounded-lg text-sm text-rise-green font-medium">
            CEO View — This page includes internal data not visible to the
            partner.
          </div>
        )}
        <PartnerHeader counselor={counselor} />
        <CounselorDetails
          counselor={counselor}
          isCeoView={isCeoView}
          secret={process.env.DASHBOARD_SECRET!}
        />
        <FunnelStats counts={funnelCounts} total={total} />
        <StudentTable students={students} />
        {isCeoView && (
          <AddConversationForm
            counselorId={counselor.id}
            counselorName={counselor.companyName}
            secret={process.env.DASHBOARD_SECRET!}
          />
        )}
        {isCeoView && conversations && (
          <ConversationLog conversations={conversations} />
        )}
      </div>
    </div>
  );
}
