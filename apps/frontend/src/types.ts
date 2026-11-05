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

export type Album = {
  id: string;
  name: string;
  artist: string;
  artist_id: string;
  image: string;
  release_date: string;
  total_tracks: number;
  runtime_ms: number;

  // enrichment
  genres: string[];

  // personal layer
  status: "unheard" | "completed" | "in_progress";
  completed_at: string | null;
  rating: number | null;

  // system
  added_at: string;
  last_synced: string;
  url: string;
};
