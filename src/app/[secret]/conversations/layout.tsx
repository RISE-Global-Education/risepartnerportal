export default function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-rise-black font-heading">
          Insights
        </h1>
        <p className="text-sm text-rise-brown mt-1">
          Track partner conversations, intent, and outreach over time
        </p>
      </div>
      {children}
    </div>
  );
}
