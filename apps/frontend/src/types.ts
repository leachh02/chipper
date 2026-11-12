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

  // When Chipper first saw it
  importedAt: number;
  lastSeenAt: number;
  // Higher is nearer the top of Watch Later, as of the latest sync that read
  // it. With Watch Later sorted newest first, that's the most recently added.
  watchLaterOrder?: number;
  // From the Watch Later page, as of the latest sync that read them. The
  // upload time is approximate, since YouTube only says "3 years ago".
  views?: number;
  uploadedAt?: number;
  // Set when the video is no longer in Watch Later
  removedAt?: number;
  status: ChipStatus;
  // When the user last changed their own fields (status, flags, genres),
  // so merging a backup knows which device's choice is newer
  changedAt?: number;
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
  sortBy: "title" | "channel" | "duration" | "addedToWatchLater" | "addedToChipper" | "views" | "uploaded";
  sortOrder: "asc" | "desc";
  durationRange: [number, number];
  statusFilter: ChipStatus[];
  // Shown under each topic, on a server that groups by topic
  groupByTopic?: boolean;
};

// Marks albums with no genres from Discogs
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

export type PodcastPreferences = {
  sortBy: "added" | "release" | "duration";
  statusFilter: ChipStatus[];
  // Minutes left to listen, so part-listened episodes count what remains
  durationRange: [number, number];
  groupByTopic?: boolean;
};

export type QueuePreferences = {
  // How long the last session was, in minutes
  minutes: number;
  sources: ItemType[];
  // Topics to stick to, as "video:<label>" or "episode:<label>". A kind
  // with none chosen isn't narrowed down.
  topics?: string[];
};

export type Preferences = {
  id: "singleton";
  maxDailyMinutes: number;
  hideShorts: boolean;
  youtube: YouTubePreferences;
  spotify: SpotifyPreferences;
  podcasts: PodcastPreferences;
  queue: QueuePreferences;
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
  // As the page shows them, e.g. "1.2M views" and "3 years ago"
  views?: string;
  uploaded?: string;
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
  // Set when the user has edited the genres, so imports leave them alone
  genresEdited?: boolean;

  // personal layer
  status: ChipStatus;
  completed_at: string | null;
  rating: number | null;
  // Keen to listen to this soon
  // Shown as "Shortlist"; the stored name predates it
  upNext?: boolean;
  loved?: boolean;

  // system
  added_at: string;
  last_synced: string;
  url: string;
  // Set when the album is no longer saved in Spotify
  removedAt?: number;
  // When the user last changed their own fields (status, flags, genres),
  // so merging a backup knows which device's choice is newer
  changedAt?: number;
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
  // When the user last changed their own fields (status, flags, genres),
  // so merging a backup knows which device's choice is newer
  changedAt?: number;
  // When Spotify last listed it
  lastSyncedAt?: number;
};

// The kinds of item a Chipper server can group by topic
export type TopicKind = "video" | "episode";

export type Topic = { label: string; ids: string[] };

// A backlog grouped by topic, worked out by a Chipper server's clustering
// service and synced to every device. One per kind; only the server writes it.
export type Topics = {
  id: TopicKind;
  itemType: TopicKind;
  // Largest first
  groups: Topic[];
  // How many groups were asked for, or null when the service chose
  requested: number | null;
  createdAt: number;
};

// One per record the sync server has, keyed "video:<id>" and so on, plus
// "cursor" for the last revision this device pulled
export type SyncEntry = {
  key: string;
  // A fingerprint of the server's copy, to spot what changed here since
  hash?: string;
  revision?: number;
};
