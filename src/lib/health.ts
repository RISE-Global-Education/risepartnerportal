export interface HealthVar {
  key: string;
  label: string;
  description: string;
  present: boolean;
  preview: string | null;
}

export interface HealthResponse {
  ok: boolean;
  vars: HealthVar[];
  checkedAt: string;
}

const ENV_VARS = [
  { key: "AIRTABLE_TOKEN", label: "Airtable Token", description: "Read/write access to Airtable bases" },
  { key: "AIRTABLE_COUNSELOR_TOKEN", label: "Airtable Counselor Token", description: "Scoped token for counselor create/update routes" },
  { key: "DASHBOARD_SECRET", label: "Dashboard Secret", description: "Secret slug gating /dashboard/[secret] routes" },
  { key: "NEXT_PUBLIC_BASE_URL", label: "Base URL", description: "Used server-side to call internal API routes" },
];

export function getHealth(): HealthResponse {
  const vars: HealthVar[] = ENV_VARS.map(({ key, label, description }) => {
    const value = process.env[key];
    const present = !!value && value.trim() !== "";
    const preview = present ? value!.slice(0, 6) + "…" : null;
    return { key, label, description, present, preview };
  });

  return { ok: vars.every((v) => v.present), vars, checkedAt: new Date().toISOString() };
}
