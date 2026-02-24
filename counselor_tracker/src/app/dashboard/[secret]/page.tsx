import { Suspense } from "react";
import { getAllLeads, getAllApplications, getAllCounselorRecords, computeAnalytics } from "@/lib/analytics";
import { getAllCounselors } from "@/lib/counselors";
import TimePeriodSelector from "@/components/dashboard/TimePeriodSelector";
import FunnelOverviewCards from "@/components/dashboard/FunnelOverviewCards";
import PendingActionsChart from "@/components/dashboard/PendingActionsChart";
import LeadsVsApplicationsChart from "@/components/dashboard/LeadsVsApplicationsChart";
import StageEntriesChart from "@/components/dashboard/StageEntriesChart";
import InterviewsChart from "@/components/dashboard/InterviewsChart";
import ConversionFunnel from "@/components/dashboard/ConversionFunnel";
import DropOffChart from "@/components/dashboard/DropOffChart";
import VelocityChart from "@/components/dashboard/VelocityChart";
import TopCounselorsChart from "@/components/dashboard/TopCounselorsChart";
import CounselorActivityChart from "@/components/dashboard/CounselorActivityChart";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30d" } = await searchParams;

  const [leads, applications, counselorRecords, counselors] = await Promise.all([
    getAllLeads(),
    getAllApplications(),
    getAllCounselorRecords(),
    getAllCounselors(),
  ]);

  // Build counselorId → company name map
  const counselorNameMap = new Map<string, string>();
  for (const c of counselors) {
    counselorNameMap.set(c.counselorId, c.companyName);
  }

  const analytics = computeAnalytics(leads, applications, counselorRecords, counselorNameMap, period);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Time Period Selector */}
      <div className="sticky top-14 z-40 bg-rise-cream py-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-rise-black font-heading">Analytics Dashboard</h1>
          <Suspense>
            <TimePeriodSelector />
          </Suspense>
        </div>
      </div>

      {/* Section 1: Pipeline Snapshot */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Pipeline Snapshot</h2>
        <FunnelOverviewCards
          stageCounts={analytics.stageCounts}
          stageCountsPrevious={analytics.stageCountsPrevious}
        />
        <div className="mt-4">
          <PendingActionsChart subStageCounts={analytics.subStageCounts} />
        </div>
      </section>

      {/* Section 2: Flow Over Time */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Flow Over Time</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadsVsApplicationsChart data={analytics.leadsOverTime} />
          <StageEntriesChart data={analytics.stageEntriesOverTime} />
        </div>
        <div className="mt-4">
          <InterviewsChart data={analytics.interviewsOverTime} />
        </div>
      </section>

      {/* Section 3: Conversion & Drop-off */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Conversion & Drop-off</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConversionFunnel data={analytics.conversionFunnel} />
          <DropOffChart data={analytics.dropOffs} />
        </div>
      </section>

      {/* Section 4: Velocity */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Velocity</h2>
        <VelocityChart data={analytics.velocity} />
      </section>

      {/* Section 5: Counselor Insights */}
      <section className="mt-8 pb-8">
        <h2 className="text-xs font-semibold text-rise-brown uppercase tracking-wide mb-3">Counselor Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopCounselorsChart data={analytics.topCounselors} />
          <CounselorActivityChart data={analytics.counselorActivity} />
        </div>
      </section>
    </div>
  );
}
