import { describe, expect, it } from "vitest";
import { InvalidCutoffError, parseCutoff, splitByCutoff } from "./invoice-cutoff";

describe("parseCutoff", () => {
  it("fails closed when the cutoff is missing or blank", () => {
    expect(() => parseCutoff(undefined)).toThrow(InvalidCutoffError);
    expect(() => parseCutoff("")).toThrow(InvalidCutoffError);
    expect(() => parseCutoff("   ")).toThrow(InvalidCutoffError);
  });

  it("fails closed when the cutoff is not a date", () => {
    expect(() => parseCutoff("last tuesday")).toThrow(InvalidCutoffError);
  });

  it("parses an ISO 8601 date", () => {
    expect(parseCutoff("2026-11-20T00:00:00Z").toISOString()).toBe("2026-11-20T00:00:00.000Z");
  });
});

describe("splitByCutoff", () => {
  const cutoff = new Date("2026-11-20T00:00:00Z");
  const file = (name: string, createdTime: string | null) => ({ name, createdTime });

  it("skips files created before the cutoff and keeps the rest", () => {
    const { eligible, skipped } = splitByCutoff(
      [
        file("old", "2026-11-19T23:59:59Z"),
        file("exactly", "2026-11-20T00:00:00Z"),
        file("new", "2026-12-01T09:00:00Z"),
      ],
      cutoff
    );
    expect(eligible.map((f) => f.name)).toEqual(["exactly", "new"]);
    expect(skipped).toBe(1);
  });

  it("skips a file with a missing or unreadable creation time", () => {
    const { eligible, skipped } = splitByCutoff(
      [file("none", null), file("garbage", "not a date")],
      cutoff
    );
    expect(eligible).toEqual([]);
    expect(skipped).toBe(2);
  });
});
