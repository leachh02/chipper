import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FaDatabase, FaHome, FaHourglassHalf, FaSpotify, FaYoutube } from "react-icons/fa";
import { SPOTIFY } from "../config";

type Item = { to: string; label: string; short: string; icon: ReactNode };

const ITEMS: Item[] = [
  { to: "/", label: "Home", short: "Home", icon: <FaHome /> },
  { to: "/queue", label: "Chip session", short: "Session", icon: <FaHourglassHalf /> },
  { to: "/dashboard/youtube", label: "Watch Later", short: "Watch Later", icon: <FaYoutube /> },
  ...(SPOTIFY.enabled
    ? [{ to: "/dashboard/spotify", label: "Spotify", short: "Spotify", icon: <FaSpotify /> }]
    : []),
  { to: "/data", label: "Your data", short: "Data", icon: <FaDatabase /> },
];

// A top bar on wider screens, and a tab bar along the bottom on phones
export default function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-7 w-7" />
            Chipper
          </NavLink>
          <nav aria-label="Main" className="hidden sm:flex items-center gap-1 text-sm">
            {ITEMS.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    isActive ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Room for the tab bar on phones */}
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                  isActive ? "text-accent" : "text-muted"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
