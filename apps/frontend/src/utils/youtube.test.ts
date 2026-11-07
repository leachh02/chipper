import { describe, expect, it } from "vitest";
import { durationToSeconds, parseVideoIdsFromCsv } from "./youtube";

describe("durationToSeconds", () => {
  it("reads h:mm:ss, m:ss and bad input", () => {
    expect(durationToSeconds("1:02:03")).toBe(3723);
    expect(durationToSeconds("4:20")).toBe(260);
    expect(durationToSeconds("")).toBe(0);
    expect(durationToSeconds("LIVE")).toBe(0);
  });
});

describe("parseVideoIdsFromCsv", () => {
  it("reads the Video ID column of a Google Takeout export", () => {
    const csv = [
      "Video ID,Playlist Video Creation Timestamp",
      "dQw4w9WgXcQ,2024-01-01T00:00:00+00:00",
      " 9bZkp7q19f0 ,2024-01-02T00:00:00+00:00",
    ].join("\n");
    expect(parseVideoIdsFromCsv(csv)).toEqual(["dQw4w9WgXcQ", "9bZkp7q19f0"]);
  });

  it("finds YouTube links in any column, once each", () => {
    const csv = [
      "Title,Link",
      "One,https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
      "Two,https://youtu.be/9bZkp7q19f0",
      "Again,https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ].join("\r\n");
    expect(parseVideoIdsFromCsv(csv)).toEqual(["dQw4w9WgXcQ", "9bZkp7q19f0"]);
  });

  it("doesn't mistake other 11-letter words for video IDs", () => {
    const csv = ["Title,Description", "Something,Description", "Other,https://example.com/watch?v=dQw4w9WgXcQ"].join(
      "\n",
    );
    expect(parseVideoIdsFromCsv(csv)).toEqual([]);
  });
});
