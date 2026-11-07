import { describe, expect, it } from "vitest";
import { formatRuntime, inDurationRange, releaseYear } from "./format";

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
