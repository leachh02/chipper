// 4_380_000 -> "1h 13m", 10_800_000 -> "3h", 900_000 -> "15m"
export function formatRuntime(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

// "1997-05-21" or "1997" -> 1997
export function releaseYear(releaseDate: string) {
  return Number(releaseDate.slice(0, 4)) || null;
}

// For a DurationRange slider, where the top of the range means "and longer"
export function inDurationRange(minutes: number, [low, high]: [number, number], max: number) {
  return minutes >= low && (high >= max || minutes <= high);
}

// 1234567 -> "1.2M views", 1 -> "1 view"
export function formatViews(views: number) {
  const count = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(views);
  return `${count} ${views === 1 ? "view" : "views"}`;
}

const AGES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

// Like YouTube's "3 years ago", in the largest whole unit
export function formatAge(time: number, now = Date.now()) {
  const ms = Math.max(0, now - time);
  const age = AGES.find(([, size]) => ms >= size);
  if (!age) return "just now";
  const [unit, size] = age;
  return new Intl.RelativeTimeFormat("en", { numeric: "always" }).format(-Math.floor(ms / size), unit);
}
