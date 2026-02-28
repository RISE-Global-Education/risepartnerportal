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
  { key: "MIXMAX_API_KEY", label: "Mixmax API Key", description: "Required for Mixmax email insights" },
  { key: "CRON_SECRET", label: "Cron Secret", description: "Protects /api/cron/* endpoints" },
  { key: "GMAIL_USER", label: "Gmail User", description: "Gmail account for daily check emails" },
  { key: "GMAIL_APP_PASSWORD", label: "Gmail App Password", description: "App password for Gmail sending" },
  { key: "NOTIFY_EMAIL", label: "Notify Email", description: "Recipients for daily check reports" },
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
