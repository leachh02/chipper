// Where an item is in the backlog. Shared by every kind of item Chipper tracks.
export type ChipStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "skipped"
  | "deferred";

export type ItemType = "video" | "album";

export type Video = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  url: string;
  thumbnail?: string;

  importedAt: number;
  lastSeenAt: number;
  status: ChipStatus;
};

// One entry per status change, for history and future stats
export type ChipEvent = {
  id: string;
  itemType: ItemType;
  itemId: string;
  status: ChipStatus;
  timestamp: number;
};

export type YouTubePreferences = {
  sortBy: "title" | "channel" | "duration";
  sortOrder: "asc" | "desc";
  thumbnailsFirst: boolean;
  durationRange: [number, number];
  statusFilter: ChipStatus[];
};

export type Preferences = {
  id: "singleton";
  maxDailyMinutes: number;
  hideShorts: boolean;
  youtube: YouTubePreferences;
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
  status: ChipStatus;
  completed_at: string | null;
  rating: number | null;

  // system
  added_at: string;
  last_synced: string;
  url: string;
};
