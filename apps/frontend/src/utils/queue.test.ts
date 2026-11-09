import { describe, expect, it } from "vitest";
import type { Topics } from "../types";
import { buildQueue, inTopics, type QueueItem } from "./queue";

const item = (key: string, minutes: number, extra: Partial<QueueItem> = {}): QueueItem => ({
  key,
  type: "video",
  id: key,
  title: key,
  subtitle: "",
  image: "",
  url: "",
  minutes,
  status: "queued",
  shortlisted: false,
  ...extra,
});

const keys = (items: QueueItem[]) => items.map((i) => i.key);

describe("buildQueue", () => {
  it("puts started items first, then the shortlist, then the shortest", () => {
    const items = [
      item("long", 30),
      item("short", 5),
      item("shortlisted", 20, { shortlisted: true }),
      item("started", 25, { status: "in_progress" }),
    ];
    expect(keys(buildQueue(items, 100))).toEqual(["started", "shortlisted", "short", "long"]);
  });

  it("skips what doesn't fit and fills the gap with shorter items", () => {
    const items = [item("a", 10), item("b", 25), item("c", 15), item("d", 3)];
    // 3 + 10 + 15 = 28; 25 no longer fits
    expect(keys(buildQueue(items, 30))).toEqual(["d", "a", "c"]);
  });

  it("leaves out items with no known length", () => {
    expect(keys(buildQueue([item("unknown", 0), item("a", 5)], 60))).toEqual(["a"]);
  });

  it("returns nothing when nothing fits", () => {
    expect(buildQueue([item("a", 50)], 30)).toEqual([]);
  });
});

describe("inTopics", () => {
  const topics: Topics[] = [
    {
      id: "video",
      itemType: "video",
      groups: [
        { label: "Cooking", ids: ["pasta", "curry"] },
        { label: "Space", ids: ["moon"] },
      ],
      requested: null,
      createdAt: 0,
    },
  ];
  const items = [
    item("pasta", 10),
    item("curry", 10),
    item("moon", 10),
    item("new", 10),
    item("pod", 10, { type: "episode" }),
    item("album", 10, { type: "album" }),
  ];

  it("keeps only the chosen topics of a kind, and leaves other kinds alone", () => {
    expect(keys(inTopics(items, topics, ["video:Cooking"]))).toEqual(["pasta", "curry", "pod", "album"]);
    expect(keys(inTopics(items, topics, ["video:Cooking", "video:Space"]))).toEqual([
      "pasta",
      "curry",
      "moon",
      "pod",
      "album",
    ]);
  });

  it("narrows nothing when no topic is chosen, or the chosen ones are gone", () => {
    expect(inTopics(items, topics, [])).toEqual(items);
    expect(inTopics(items, topics, ["video:Woodworking"])).toEqual(items);
  });
});
