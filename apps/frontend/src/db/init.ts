import { getDB } from "./index";
import type { Preferences, Meta } from "../types";

export async function initializeDefaults() {
  const db = await getDB();

  // 1️⃣ Preferences
  const prefs = await db.get("preferences", "singleton");
  if (!prefs) {
    await db.put("preferences", {
      id: "singleton",
      sortBy: "date",
      maxDailyMinutes: 60,
      hideShorts: true,
    } as Preferences);
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
