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
