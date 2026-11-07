// Small per-browser flags, like "the setup guide was dismissed". Storage can
// be unavailable (private windows, blocked site data), so failures are ignored.
export type Flag = "sessionTried" | "guideHidden";

export function getFlag(flag: Flag): boolean {
  try {
    return localStorage.getItem(`chipper.${flag}`) === "1";
  } catch {
    return false;
  }
}

export function setFlag(flag: Flag, on = true) {
  try {
    if (on) localStorage.setItem(`chipper.${flag}`, "1");
    else localStorage.removeItem(`chipper.${flag}`);
  } catch {
    // Not worth bothering anyone about
  }
}
