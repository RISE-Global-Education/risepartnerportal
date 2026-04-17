import StudentInterviewsSubTabNav from "./SubTabNav";

export default async function StudentInterviewsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <div>
      <h2 className="text-base font-semibold text-rise-black font-heading">Student Interviews</h2>
      <StudentInterviewsSubTabNav secret={secret} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
