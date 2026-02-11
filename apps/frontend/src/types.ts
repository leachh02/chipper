export type Video = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
  thumbnail?: string;

  importedAt: number;
  lastSeenAt: number;
  status: "queued" | "watched" | "skipped";
};

export type VideoEvent = {
  id: string;
  videoId: string;
  type: "watched" | "skipped" | "deferred";
  timestamp: number;
};

export type Preferences = {
  id: "singleton";
  sortBy: "duration" | "date" | "priority";
  maxDailyMinutes: number;
  hideShorts: boolean;
};

export type Meta = {
  id: "singleton";
  lastImportAt: number;
  appVersion: string;
};

export type RawVideo = {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
  thumbnail?: string;
  addedAt?: number;
};
