import type { Conversation } from "@/lib/types";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ConversationLog({
  conversations,
}: {
  conversations: Conversation[];
}) {
  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-rise-brown mt-8">
        No conversations logged yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-rise-black font-heading">
          Conversation History
        </h2>
        <p className="text-sm text-rise-brown mt-1">
          Internal — not visible to the partner
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {conversations.map((conv) => (
          <div key={conv.id} className="px-6 py-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-rise-black">
                {formatDate(conv.date)}
              </span>
              {conv.attendee && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rise-cream text-rise-brown">
                  {conv.attendee}
                </span>
              )}
            </div>
            {conv.notes && (
              <p className="text-sm text-rise-black/80 whitespace-pre-wrap leading-relaxed">
                {conv.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
