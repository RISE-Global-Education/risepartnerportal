import MentorInterviewsSubTabNav from "./SubTabNav";

export default async function MentorInterviewsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  return (
    <div>
      <h2 className="text-base font-semibold text-rise-black font-heading">Mentor Interviews</h2>
      <MentorInterviewsSubTabNav secret={secret} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
