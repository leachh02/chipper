import { useEffect, useState, type FormEvent } from "react";
import { server } from "../sync/api";
import { useSync } from "../sync/context";
import ServerUsers from "./ServerUsers";

function timeAgo(at: number) {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "a minute ago" : `${minutes} minutes ago`;
}

// Signing in to the self-hosted server, and what's synced
export default function ServerAccount() {
  const { session, state, error, lastSyncedAt, syncNow, signIn, signOut } = useSync();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) return;
    server
      .status()
      .then((s) => setNeedsSetup(s.needsSetup))
      .catch((err) => setFormError((err as Error).message));
  }, [session]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const signedIn = needsSetup
        ? await server.setup(username, password)
        : await server.login(username, password);
      setPassword("");
      await signIn(signedIn);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <section className="card my-6 p-4">
        <h2 className="text-lg font-semibold">
          {needsSetup ? "Set up your Chipper server" : "Sync with your Chipper server"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {needsSetup
            ? "Nobody has an account yet. The first account you create here is the admin, who can add everyone else."
            : "Sign in to keep this device in step with your others. What's already on this device is merged into your account."}
        </p>
        <form className="mt-3 flex flex-col gap-2 sm:max-w-sm" onSubmit={submit}>
          <label className="flex flex-col gap-1 text-sm">
            Username
            <input
              className="input"
              autoComplete="username"
              required
              maxLength={64}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              className="input"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary self-start" disabled={busy || needsSetup === null}>
            {needsSetup ? "Create admin account" : "Sign in"}
          </button>
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
        </form>
      </section>
    );
  }

  const status =
    state === "syncing"
      ? "Syncing..."
      : state === "error"
        ? error
        : lastSyncedAt
          ? `Up to date, synced ${timeAgo(lastSyncedAt)}.`
          : "Up to date.";

  return (
    <>
      <section className="card my-6 p-4">
        <h2 className="text-lg font-semibold">Synced with your Chipper server</h2>
        <p className="mt-1 text-sm">
          Signed in as <strong>{session.user.username}</strong>
          {session.user.admin && <span className="text-muted"> (admin)</span>}. Changes you make
          here reach your other devices within a few seconds.
        </p>
        <p role="status" className={`mt-2 text-sm ${state === "error" ? "text-danger" : "text-muted"}`}>
          {status}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={syncNow} disabled={state === "syncing"}>
            Sync now
          </button>
          <button type="button" className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
        <ChangePassword token={session.token} />
      </section>
      {session.user.admin && <ServerUsers token={session.token} me={session.user.id} />}
    </>
  );
}

function ChangePassword({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await server.changePassword(token, current, next);
      setCurrent("");
      setNext("");
      setOpen(false);
      setMessage({ text: "Password changed. Your other devices will need to sign in again.", error: false });
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true });
    }
  }

  return (
    <div className="mt-3">
      {!open && (
        <button type="button" className="link text-sm" onClick={() => setOpen(true)}>
          Change password
        </button>
      )}
      {open && (
        <form className="flex flex-col gap-2 sm:max-w-sm" onSubmit={submit}>
          <label className="flex flex-col gap-1 text-sm">
            Current password
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            New password
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">
              Change password
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role={message.error ? "alert" : "status"} className={`mt-2 text-sm ${message.error ? "text-danger" : ""}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
