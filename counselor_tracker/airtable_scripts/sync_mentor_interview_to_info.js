// Airtable Script: Sync Mentor Interview → Mentor Info Form
// Run this from the Mentor Info Form table after a new record is received.
// It matches on Email ID, then writes Rate, Interview Date, and Interview Notes (as Notes).

const MENTOR_INTERVIEW_TABLE = "Mentor Interview";
const MENTOR_INFO_TABLE = "Mentor Info Form";

const mentorInfoTable = base.getTable(MENTOR_INFO_TABLE);
const mentorInterviewTable = base.getTable(MENTOR_INTERVIEW_TABLE);

// Get the most recently created record in Mentor Info Form
const infoQuery = await mentorInfoTable.selectRecordsAsync({
  sorts: [{ field: "Created Time", direction: "desc" }],
  fields: ["Email ID", "Rate", "Interview Date", "Notes"],
});

if (infoQuery.records.length === 0) {
  console.log("No records found in Mentor Info Form.");
  return;
}

const latestRecord = infoQuery.records[0];
const email = (latestRecord.getCellValueAsString("Email ID") ?? "").toLowerCase().trim();

if (!email) {
  console.log("Latest record has no email. Stopping.");
  return;
}

console.log(`Checking email: ${email}`);

// Find matching record in Mentor Interview table
const interviewQuery = await mentorInterviewTable.selectRecordsAsync({
  fields: ["Email ID", "Rate", "Interview Date", "Interview Notes"],
});

const match = interviewQuery.records.find(
  (r) => (r.getCellValueAsString("Email ID") ?? "").toLowerCase().trim() === email
);

if (!match) {
  console.log(`No match found in Mentor Interview table for: ${email}`);
  return;
}

const rate          = match.getCellValueAsString("Rate") ?? null;
const interviewDate = match.getCellValue("Interview Date") ?? null;
const notes         = match.getCellValueAsString("Interview Notes") ?? null;

console.log(`Match found!`);
console.log(`  Rate: ${rate}`);
console.log(`  Interview Date: ${interviewDate}`);
console.log(`  Notes: ${notes}`);

// Build update payload — only write fields that have values
const updates = {};
if (rate)          updates["Rate"] = rate;
if (interviewDate) updates["Interview Date"] = interviewDate;
if (notes)         updates["Notes"] = notes;

if (Object.keys(updates).length === 0) {
  console.log("Nothing to update — all fields are empty in Mentor Interview table.");
  return;
}

await mentorInfoTable.updateRecordAsync(latestRecord.id, updates);
console.log(`Updated Mentor Info Form record for ${email} successfully.`);
