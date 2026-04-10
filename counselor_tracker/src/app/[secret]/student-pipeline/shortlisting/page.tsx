import { redirect } from "next/navigation";

// ShortlistApplicant type is kept here for use by the acceptance page
export interface ShortlistApplicant {
  recordId: string;
  applicantId: string;
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  currentGrade: string;
  schoolCollege: string;
  city: string;
  country: string;
  cohort: string;
  fieldsOfInterest: string;
  motivation: string;
  priorExperience: string;
  academicScore: string;
  testScores: string;
  previouslyApplied: string;
  howHeard: string;
  howHeardDetail: string;
  researchPackage: string;
  followUpStatus: string;
  shortlistSentTime: string;
  acceptanceSentTime: string;
  interviewDate: string;
  notes: string;
  callStatus: string;
  callNotes: string;
}

export default async function ShortlistingPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  redirect(`/${secret}/student-pipeline/shortlisting/interview-not-booked`);
}
