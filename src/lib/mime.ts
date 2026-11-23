// Mail header encoding, kept free of any Gmail imports so it can be tested alone.

// A header value may not contain line breaks, or it could inject extra headers.
export function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

// Splits text into pieces of at most `maxBytes` UTF-8 bytes without ever cutting
// a character in half.
function chunkByBytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of text) {
    const bytes = Buffer.byteLength(char, "utf8");
    if (currentBytes + bytes > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Makes a header value safe for any text, such as a subject with a dash that is
 * not plain ASCII. Plain ASCII passes through unchanged. Anything else becomes
 * RFC 2047 encoded words (=?UTF-8?B?...?=), each within the 75 character limit
 * and folded onto continuation lines.
 */
export function encodeHeader(value: string): string {
  const clean = cleanHeader(value);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return chunkByBytes(clean, 45)
    .map((chunk) => `=?UTF-8?B?${Buffer.from(chunk, "utf8").toString("base64")}?=`)
    .join("\r\n ");
}
