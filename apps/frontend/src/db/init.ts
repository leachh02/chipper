import { getDB } from "./index";
import type { Preferences, Meta } from "../types";

export const DEFAULT_PREFERENCES: Preferences = {
  id: "singleton",
  maxDailyMinutes: 60,
  hideShorts: true,
  youtube: {
    sortBy: "duration",
    sortOrder: "asc",
    thumbnailsFirst: true,
    durationRange: [0, 120],
    statusFilter: ["queued", "in_progress"],
  },
};

export async function initializeDefaults() {
  const db = await getDB();

  // 1️⃣ Preferences
  const prefs = await db.get("preferences", "singleton");
  if (!prefs) {
    await db.put("preferences", DEFAULT_PREFERENCES);
  }

  // 2️⃣ Meta
  const meta = await db.get("meta", "singleton");
  if (!meta) {
    await db.put("meta", {
      id: "singleton",
      lastImportAt: 0,
      appVersion: "0.1.0",
    } as Meta);
  }
}
