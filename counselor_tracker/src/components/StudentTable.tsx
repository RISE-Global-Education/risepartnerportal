import type { Student, FunnelStage } from "@/lib/types";

const STAGE_BADGE: Record<FunnelStage, string> = {
  Lead: "bg-rise-cream text-rise-brown",
  Application: "bg-blue-50 text-blue-700",
  Interview: "bg-amber-50 text-amber-700",
  Client: "bg-emerald-50 text-rise-green",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-rise-brown">
        No students referred yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-rise-black font-heading">
          Referred Students
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-6 py-3 font-medium text-rise-brown">Name</th>
              <th className="px-6 py-3 font-medium text-rise-brown">Stage</th>
              <th className="px-6 py-3 font-medium text-rise-brown">Date Entered</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-3 font-medium text-rise-black">
                  {student.name}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STAGE_BADGE[student.stage]}`}
                  >
                    {student.stage}
                  </span>
                </td>
                <td className="px-6 py-3 text-rise-brown">
                  {formatDate(student.dateEntered)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
