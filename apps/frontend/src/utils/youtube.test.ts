import { describe, expect, it } from "vitest";
import type { Video } from "../types";
import {
  durationToSeconds,
  parseUploaded,
  parseVideoIdsFromCsv,
  parseViews,
  sortVideos,
} from "./youtube";

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

describe("parseViews", () => {
  it.each([
    ["1.2M views", 1_200_000],
    ["1,234 views", 1234],
    ["845K views", 845_000],
    ["2.1B views", 2_100_000_000],
    ["776 million views", 776_000_000],
    ["12 thousand views", 12_000],
    ["1 view", 1],
    ["No views", 0],
    ["1,2 Mio. Aufrufe", undefined],
    [undefined, undefined],
  ])("%s -> %s", (text, views) => {
    expect(parseViews(text)).toBe(views);
  });
});

describe("parseUploaded", () => {
  const now = Date.parse("2026-11-12T00:00:00Z");
  it("goes back from now", () => {
    expect(parseUploaded("2 days ago", now)).toBe(now - 2 * 86_400_000);
    expect(parseUploaded("Streamed 1 year ago", now)).toBe(now - 365 * 86_400_000);
    expect(parseUploaded("vor 2 Tagen", now)).toBeUndefined();
  });
});

describe("sortVideos", () => {
  const video = (id: string, extra: Partial<Video>): Video => ({
    id,
    title: id,
    channel: "",
    duration: "1:00",
    url: "",
    importedAt: 0,
    lastSeenAt: 0,
    status: "queued",
    ...extra,
  });
  const ids = (videos: Video[]) => videos.map((v) => v.id);

  it("puts videos without the number last, either way", () => {
    const videos = [video("none", {}), video("few", { views: 10 }), video("many", { views: 900 })];
    expect(ids(sortVideos(videos, "views", "desc"))).toEqual(["many", "few", "none"]);
    expect(ids(sortVideos(videos, "views", "asc"))).toEqual(["few", "many", "none"]);
  });

  it("breaks ties in when Chipper saw them by Watch Later's order", () => {
    const videos = [
      video("lower", { importedAt: 5, watchLaterOrder: 1 }),
      video("later", { importedAt: 9 }),
      video("higher", { importedAt: 5, watchLaterOrder: 2 }),
    ];
    expect(ids(sortVideos(videos, "addedToChipper", "desc"))).toEqual(["later", "higher", "lower"]);
  });
});
