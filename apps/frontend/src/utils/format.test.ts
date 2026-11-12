import { describe, expect, it } from "vitest";
import { formatAge, formatRuntime, formatViews, inDurationRange, releaseYear } from "./format";

describe("formatRuntime", () => {
  it("shows hours and minutes", () => {
    expect(formatRuntime(4_380_000)).toBe("1h 13m");
    expect(formatRuntime(10_800_000)).toBe("3h");
    expect(formatRuntime(900_000)).toBe("15m");
  });
});

describe("inDurationRange", () => {
  it("treats the top of the slider as no limit", () => {
    expect(inDurationRange(300, [0, 240], 240)).toBe(true);
    expect(inDurationRange(300, [0, 120], 240)).toBe(false);
    expect(inDurationRange(5, [10, 240], 240)).toBe(false);
  });
});

describe("releaseYear", () => {
  it("reads full dates and bare years", () => {
    expect(releaseYear("1997-05-21")).toBe(1997);
    expect(releaseYear("1997")).toBe(1997);
    expect(releaseYear("")).toBeNull();
  });
});

describe("formatViews", () => {
  it("shortens like YouTube", () => {
    expect(formatViews(776_000_000)).toBe("776M views");
    expect(formatViews(1_234)).toBe("1.2K views");
    expect(formatViews(1)).toBe("1 view");
  });
});

describe("formatAge", () => {
  it("uses the largest whole unit", () => {
    const now = Date.parse("2026-11-12T00:00:00Z");
    expect(formatAge(now - 3 * 365 * 86_400_000, now)).toBe("3 years ago");
    expect(formatAge(now - 2 * 86_400_000, now)).toBe("2 days ago");
    expect(formatAge(now, now)).toBe("just now");
  });
});
