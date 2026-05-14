import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import createReport from "docx-templates";

const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET!;
const PDF_CONVERT_API_KEY = process.env.PDF_CONVERT_API_KEY!;

type TierRow = { amount: string; studentNumber: string };

interface GenerateBody {
  secret: string;
  type: "scholarship" | "referral-normal" | "referral-tier";
  partnerName: string;
  date: string;
  signatory: string;
  scholarshipAmount?: string;
  referralAmount?: string;
  tiers?: TierRow[];
}

async function convertDocxToPdf(docxBuffer: Uint8Array): Promise<Uint8Array> {
  // Step 1: Upload file to PDF.co
  const base64 = Buffer.from(docxBuffer).toString("base64");

  const uploadRes = await fetch("https://api.pdf.co/v1/file/upload/base64", {
    method: "POST",
    headers: {
      "x-api-key": PDF_CONVERT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "document.docx", file: base64 }),
  });

  if (!uploadRes.ok) throw new Error(`PDF.co upload failed: ${uploadRes.status}`);
  const uploadData = await uploadRes.json();
  if (uploadData.error) throw new Error(`PDF.co upload error: ${uploadData.message}`);

  // Step 2: Convert to PDF
  const convertRes = await fetch("https://api.pdf.co/v1/pdf/convert/from/doc", {
    method: "POST",
    headers: {
      "x-api-key": PDF_CONVERT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: uploadData.url, async: false }),
  });

  if (!convertRes.ok) throw new Error(`PDF.co conversion failed: ${convertRes.status}`);
  const convertData = await convertRes.json();
  if (convertData.error) throw new Error(`PDF.co conversion error: ${convertData.message}`);

  // Step 3: Download the PDF
  const pdfRes = await fetch(convertData.url);
  if (!pdfRes.ok) throw new Error("Failed to download converted PDF");
  return new Uint8Array(await pdfRes.arrayBuffer());
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.secret !== DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await handleGenerate(body);
  } catch (err) {
    console.error("[MOU generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

async function handleGenerate(body: GenerateBody) {
  const templateMap: Record<string, string> = {
    scholarship: "scholarship-mou.docx",
    "referral-normal": "referral-normal-mou.docx",
    "referral-tier": "referral-tier-mou.docx",
  };

  const templateFile = templateMap[body.type];
  if (!templateFile) {
    return NextResponse.json({ error: "Invalid MOU type" }, { status: 400 });
  }

  const templatePath = path.join(process.cwd(), "public", "templates", templateFile);
  const templateBuffer = await readFile(templatePath);

  const data: Record<string, unknown> = {
    partner_name: body.partnerName,
    date: body.date,
    signatory: body.signatory,
    first_name: body.signatory,
  };

  if (body.type === "scholarship") {
    data.scholarship_amount = body.scholarshipAmount ?? "";
  } else if (body.type === "referral-normal") {
    data.referral_amount = body.referralAmount ?? "";
  } else if (body.type === "referral-tier") {
    const tiers = (body.tiers ?? []).filter((t) => t.amount?.trim());
    const romanNumerals = ["I", "II", "III", "IV", "V"];
    for (let i = 0; i < 5; i++) {
      const t = tiers[i];
      if (!t) {
        data[`tier_${i + 1}_line`] = "";
      } else {
        const isLast = i === tiers.length - 1;
        const suffix = isLast ? " or more students," : " students";
        data[`tier_${i + 1}_line`] = `${romanNumerals[i]}.\t${t.amount}% for ${t.studentNumber}${suffix}`;
      }
    }
  }

  const docxBuffer = await createReport({
    template: templateBuffer,
    data,
    cmdDelimiter: ["{{", "}}"],
    failFast: false,
  });

  const pdfBuffer = await convertDocxToPdf(docxBuffer);

  const filenameParts: Record<string, string> = {
    scholarship: "Scholarship-MOU",
    "referral-normal": "Referral-MOU",
    "referral-tier": "Referral-Tier-MOU",
  };
  const filename = `${body.partnerName.replace(/\s+/g, "-")}-${filenameParts[body.type]}.pdf`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
