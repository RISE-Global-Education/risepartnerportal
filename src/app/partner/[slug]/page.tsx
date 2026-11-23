import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCounselorBySlug, getContactsForCounselor } from "@/lib/counselors";
import { getStudentsForCounselor, computeFunnelCounts } from "@/lib/students";
import { getConversationsForCounselor } from "@/lib/conversations";
import BackButton from "./BackButton";
import PartnerHeader from "@/components/PartnerHeader";
import FunnelStats from "@/components/FunnelStats";
import StudentTable from "@/components/StudentTable";
import ConversationLog from "@/components/ConversationLog";
import AddConversationForm from "@/components/AddConversationForm";
import CounselorDetails from "@/components/CounselorDetails";
import PartnerLoginGate from "@/components/PartnerLoginGate";
import PartnerTabs, { type PartnerTab } from "@/components/PartnerTabs";
import InvoicesTab from "@/components/InvoicesTab";
import { getInvoicesForCounselor } from "@/lib/counselor-invoices";
import { hasReferralRate } from "@/lib/referral-rate";

export default async function PartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const result = await getCounselorBySlug(slug);

  if (!result) {
    notFound();
  }

  const { counselor, isCeoView } = result;

  // Only partners with a referral rate have invoices. For everyone else the tab
  // is not shown, and a link straight to it falls back to the pipeline.
  const showInvoices = hasReferralRate(counselor.referralAmount);
  const activeTab: PartnerTab = tab === "invoices" && showInvoices ? "invoices" : "pipeline";

  const cookieStore = await cookies();

  // Shown when a partner hasn't opted into password protection yet — lets them
  // create one voluntarily instead of forcing it on their first visit.
  let showSecureLoginButton = false;

  if (isCeoView) {
    // CEO-view links use the shared internal password, unrelated to the partner's own password.
    const ceoAuthed = cookieStore.get("ceo_partner_auth")?.value === "1";
    if (!ceoAuthed) {
      redirect(`/partner/${slug}/ceo-login`);
    }
  } else {
    const authedIds = (cookieStore.get("partner_auth")?.value ?? "").split(",").filter(Boolean);
    const authed = authedIds.includes(counselor.counselorId);

    if (!authed) {
      if (counselor.partnerPassword) {
        // A password has been set — the page is protected from here on.
        return <PartnerLoginGate slug={slug} companyName={counselor.companyName} />;
      }
      // No password set yet — password protection is opt-in, so the page stays open.
      showSecureLoginButton = true;
    }
  }

  // Only the active tab's data is fetched.
  const isPipeline = activeTab === "pipeline";

  const students = isPipeline ? await getStudentsForCounselor(counselor.counselorId) : [];
  const funnelCounts = computeFunnelCounts(students);
  const total = students.length;

  const contacts = isPipeline ? await getContactsForCounselor(counselor.counselorId) : [];

  let conversations = undefined;
  if (isPipeline && isCeoView) {
    conversations = await getConversationsForCounselor(counselor.counselorId);
  }

  // Invoices follow the same rule as the rest of the page: a partner who has set
  // a password is behind the login gate above, and one who has not set one can
  // see the page, invoices included.
  const invoices =
    activeTab === "invoices" ? await getInvoicesForCounselor(counselor.counselorId) : [];

  return (
    <div className="min-h-screen bg-rise-cream">
      <div className="bg-rise-green h-1.5" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isCeoView && (
          <div className="mb-4 flex items-center gap-3">
            <BackButton />
            <div className="flex-1 px-4 py-2 bg-rise-green/10 rounded-lg text-sm text-rise-green font-medium">
              CEO View — This page includes internal data not visible to the partner.
            </div>
          </div>
        )}
        {showSecureLoginButton && (
          <div className="flex justify-end mb-4">
            <a
              href={`/partner/${slug}/create-password`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-rise-green rounded-lg hover:bg-rise-green/90 transition-colors"
            >
              Secure Login
            </a>
          </div>
        )}
        <PartnerHeader counselor={counselor} isCeoView={isCeoView} secret={process.env.DASHBOARD_SECRET} />
        {showInvoices && <PartnerTabs active={activeTab} />}
        {isPipeline && (
          <>
            <CounselorDetails
              counselor={counselor}
              contacts={contacts}
              isCeoView={isCeoView}
              secret={process.env.DASHBOARD_SECRET!}
            />
            <FunnelStats counts={funnelCounts} total={total} />
            <StudentTable students={students} partnerSlug={slug} />
            {isCeoView && (
              <AddConversationForm
                counselorId={counselor.counselorId}
                counselorName={counselor.companyName}
                secret={process.env.DASHBOARD_SECRET!}
              />
            )}
            {isCeoView && conversations && (
              <ConversationLog conversations={conversations} secret={process.env.DASHBOARD_SECRET!} />
            )}
          </>
        )}
        {activeTab === "invoices" && <InvoicesTab invoices={invoices} />}
      </div>
    </div>
  );
}
