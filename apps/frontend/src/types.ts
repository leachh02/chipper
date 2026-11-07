// Where an item is in the backlog. Shared by every kind of item Chipper tracks.
export type ChipStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "skipped"
  | "deferred";

export type ItemType = "video" | "album" | "episode";

export type Video = {
  id: string;
  title: string;
  channel: string;
  duration: string;
  url: string;

  importedAt: number;
  lastSeenAt: number;
  // Set when the video is no longer in Watch Later
  removedAt?: number;
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
  durationRange: [number, number];
  statusFilter: ChipStatus[];
};

// Marks albums whose artists have no genres on Spotify
export const NO_GENRE = "__none__";

export type SpotifyPreferences = {
  sortBy: "added" | "release" | "artist" | "name" | "runtime";
  sortOrder: "asc" | "desc";
  // e.g. 1990 for the 90s
  decade: number | null;
  // A genre, NO_GENRE, or null for all
  genre: string | null;
  statusFilter: ChipStatus[];
  upNextOnly: boolean;
  lovedOnly: boolean;
};

export type Preferences = {
  id: "singleton";
  maxDailyMinutes: number;
  hideShorts: boolean;
  youtube: YouTubePreferences;
  spotify: SpotifyPreferences;
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
  // Set once genres have been looked up, even if none were found
  genresCheckedAt?: number;

  // personal layer
  status: ChipStatus;
  completed_at: string | null;
  rating: number | null;
  // Keen to listen to this soon
  upNext?: boolean;
  loved?: boolean;

  // system
  added_at: string;
  last_synced: string;
  url: string;
  // Set when the album is no longer saved in Spotify
  removedAt?: number;
};

// A podcast episode from the user's saved episodes on Spotify
export type Episode = {
  id: string;
  name: string;
  show: string;
  image: string;
  release_date: string;
  duration_ms: number;
  // How far through the user is, when Spotify shares it
  resume_position_ms: number;
  url: string;
  added_at: string;

  status: ChipStatus;
  removedAt?: number;
};
