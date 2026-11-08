import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SERVER } from "../config";
import { onChange } from "../db/changes";
import { getSession, server, ServerError, setSession, type Session } from "./api";
import { Context, type SyncState } from "./context";
import { getCursor, resetSync, syncOnce } from "./engine";


// Pushes local changes shortly after they happen, so a burst of clicks
// goes up together
const PUSH_DELAY_MS = 2000;
// In case the live stream misses something
const FALLBACK_MS = 60_000;
const RECONNECT_MS = 5000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() =>
    SERVER.enabled ? getSession() : null,
  );
  const [state, setState] = useState<SyncState>(session ? "syncing" : "off");
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // One sync at a time; a request during a sync runs once it finishes
  const running = useRef(false);
  const again = useRef(false);

  const forget = useCallback(async () => {
    setSession(null);
    setSessionState(null);
    await resetSync();
  }, []);

  const run = useCallback(async () => {
    if (!session) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setState("syncing");
    try {
      do {
        again.current = false;
        await syncOnce({
          pull: (since) => server.pull(session.token, since),
          push: (base, records) => server.push(session.token, base, records),
        });
      } while (again.current);
      setError("");
      setState("synced");
      setLastSyncedAt(Date.now());
    } catch (err) {
      setError((err as Error).message);
      setState("error");
      if (err instanceof ServerError && err.status === 401) await forget();
    } finally {
      running.current = false;
    }
  }, [session, forget]);

  useEffect(() => {
    if (!session) {
      setState("off");
      return;
    }
    run();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(run, PUSH_DELAY_MS);
    };
    const stopLocal = onChange("local", soon);
    const fallback = setInterval(run, FALLBACK_MS);
    const onVisible = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", run);

    // Hear about other devices' pushes as they happen
    const abort = new AbortController();
    (async () => {
      while (!abort.signal.aborted) {
        try {
          await server.stream(
            session.token,
            async (revision) => {
              if (revision > (await getCursor())) run();
            },
            abort.signal,
          );
        } catch {
          // Offline, or the server restarted; the fallback timer covers it
        }
        await new Promise((resolve) => setTimeout(resolve, RECONNECT_MS));
      }
    })();

    return () => {
      clearTimeout(timer);
      stopLocal();
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", run);
      abort.abort();
    };
  }, [session, run]);

  const signIn = useCallback(async (next: Session) => {
    // Start fresh, so all of this device's data goes to the account
    await resetSync();
    setSession(next);
    setSessionState(next);
  }, []);

  const signOut = useCallback(async () => {
    if (session) await server.logout(session.token).catch(() => {});
    await forget();
    setError("");
  }, [session, forget]);

  return (
    <Context.Provider value={{ session, state, error, lastSyncedAt, syncNow: run, signIn, signOut }}>
      {children}
    </Context.Provider>
  );
}
