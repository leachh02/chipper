// Talks to a self-hosted Chipper server (apps/server), which serves this
// app and its API from the same address.
const API = `${import.meta.env.BASE_URL}api`;
const SESSION_KEY = "chipper.server";

export type ServerUser = { id: number; username: string; admin: boolean };
export type Session = { token: string; user: ServerUser };

export type SyncKind = "video" | "album" | "episode" | "event";
export type SyncRecord = { kind: SyncKind; id: string; data: unknown; revision?: number };
export type Pulled = { revision: number; records: SyncRecord[] };
// A refused push means another device changed the same records first
export type PushResult = { ok: boolean; revision: number };

export class ServerError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Kept in localStorage like the Spotify sign-in, so never in backups
export function getSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private browsing can refuse storage; the session lasts until reload
  }
}

async function request<T>(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ServerError("Couldn't reach your Chipper server.", 0);
  }
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  // A refused push carries data the caller needs
  if (!response.ok && !(response.status === 409 && path === "/sync")) {
    const message =
      response.status === 401 && path !== "/auth/login"
        ? "You've been signed out of your Chipper server."
        : (data?.detail ?? `Your Chipper server said no (${response.status}).`);
    throw new ServerError(message, response.status);
  }
  return data as T;
}

const device = () => navigator.userAgent.slice(0, 100);

export const server = {
  status: () => request<{ needsSetup: boolean; version: string }>("/status"),

  setup: (username: string, password: string) =>
    request<Session>("/auth/setup", { method: "POST", body: { username, password, device: device() } }),

  login: (username: string, password: string) =>
    request<Session>("/auth/login", { method: "POST", body: { username, password, device: device() } }),

  logout: (token: string) => request<void>("/auth/logout", { method: "POST", token }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<void>("/auth/password", {
      method: "PUT",
      token,
      body: { currentPassword, newPassword },
    }),

  listUsers: (token: string) => request<ServerUser[]>("/users", { token }),

  createUser: (token: string, username: string, password: string, admin: boolean) =>
    request<ServerUser>("/users", { method: "POST", token, body: { username, password, admin } }),

  resetPassword: (token: string, id: number, password: string) =>
    request<void>(`/users/${id}/password`, { method: "PUT", token, body: { password } }),

  deleteUser: (token: string, id: number) =>
    request<void>(`/users/${id}`, { method: "DELETE", token }),

  pull: (token: string, since: number) => request<Pulled>(`/sync?since=${since}`, { token }),

  push: async (token: string, base: number, records: SyncRecord[]): Promise<PushResult> => {
    const result = await request<{ revision: number; records?: string[] }>("/sync", {
      method: "POST",
      token,
      body: { base, records },
    });
    return { ok: !result.records, revision: result.revision };
  },

  // Calls onChanged with the server's latest revision whenever another
  // device pushes, until the signal aborts or the connection drops
  async stream(token: string, onChanged: (revision: number) => void, signal: AbortSignal) {
    const response = await fetch(`${API}/sync/stream`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      signal,
    });
    if (!response.ok || !response.body) {
      throw new ServerError("Couldn't listen for changes.", response.status);
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += value;
      // Events are separated by a blank line
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const field = (name: string) =>
          event
            .split("\n")
            .find((line) => line.startsWith(`${name}:`))
            ?.slice(name.length + 1)
            .trim();
        if (field("event") === "changed") onChanged(Number(field("data")));
      }
    }
  },
};
