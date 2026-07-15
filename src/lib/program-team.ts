import { fetchAllRecords, getField } from "./airtable";

const LMS_BASE = "appgcVICtBdovYlaK";
const MASTER_TABLE = "tblsVVm53xiKTUZ5b";

export interface ProgramTeam {
  mentorName: string | null;
  writingCoachName: string | null;
  programManagerName: string | null;
}

function firstOf(value: string[] | null): string | null {
  return value && value.length > 0 ? value[0] : null;
}

export async function getProgramTeam(programId: string): Promise<ProgramTeam | null> {
  if (!programId) return null;

  const escapedProgramId = programId.trim().replace(/"/g, '\\"');
  const records = await fetchAllRecords(LMS_BASE, MASTER_TABLE, {
    filterByFormula: `{Program ID} = "${escapedProgramId}"`,
  });

  const record = records[0];
  if (!record) return null;

  return {
    mentorName: firstOf(getField<string[]>(record, "Mentor Name")),
    writingCoachName: firstOf(getField<string[]>(record, "WC Name")),
    programManagerName: firstOf(getField<string[]>(record, "Program Manager Name")),
  };
}
