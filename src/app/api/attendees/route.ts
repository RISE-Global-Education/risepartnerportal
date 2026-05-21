import { NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const BASE_ID = "appU2cJpIWIHQI4up";
const TABLE_ID = "tblIg6bBDbLvsvPiJ";

export async function GET() {
  const res = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
    {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch schema" }, { status: 500 });
  }

  const data = await res.json();
  const table = data.tables.find((t: { id: string }) => t.id === TABLE_ID);
  const field = table?.fields.find((f: { name: string }) => f.name === "Attendee");
  const choices: string[] = field?.options?.choices?.map((c: { name: string }) => c.name) ?? [];

  return NextResponse.json({ attendees: choices });
}
