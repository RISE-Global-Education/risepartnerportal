import { describe, expect, it } from "vitest";
import { cleanHeader, encodeHeader } from "./mime";

// Reads the encoded words back the way a mail client would.
function decode(header: string): string {
  return header
    .split("\r\n ")
    .map((word) => {
      const match = /^=\?UTF-8\?B\?(.+)\?=$/.exec(word);
      return match ? Buffer.from(match[1], "base64").toString("utf8") : word;
    })
    .join("");
}

describe("cleanHeader", () => {
  it("removes line breaks so a value cannot inject headers", () => {
    expect(cleanHeader("Hello\r\nBcc: x@y.com")).toBe("Hello Bcc: x@y.com");
  });
});

describe("encodeHeader", () => {
  it("leaves plain ASCII alone", () => {
    expect(encodeHeader("Your invoice for October 2026")).toBe("Your invoice for October 2026");
  });

  it("encodes a subject with a non-ASCII dash so it survives transport", () => {
    const subject = "Referral Invoice Processed – RISE Research – October 2026";
    const encoded = encodeHeader(subject);
    expect(encoded).toMatch(/^=\?UTF-8\?B\?/);
    expect(/^[\x20-\x7E\r\n]*$/.test(encoded)).toBe(true);
    expect(decode(encoded)).toBe(subject);
  });

  it("keeps every encoded word within 75 characters and never cuts a character", () => {
    const subject = "é".repeat(80) + " – end";
    const encoded = encodeHeader(subject);
    for (const word of encoded.split("\r\n ")) expect(word.length).toBeLessThanOrEqual(75);
    expect(decode(encoded)).toBe(subject);
  });
});
