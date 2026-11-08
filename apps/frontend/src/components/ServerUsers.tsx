import { useCallback, useEffect, useState, type FormEvent } from "react";
import { server, type ServerUser } from "../sync/api";

// For admins: who can use this server
export default function ServerUsers({ token, me }: { token: string; me: number }) {
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await server.listUsers(token));
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function attempt(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setMessage({ text: success, error: false });
      await load();
      return true;
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true });
      return false;
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const added = await attempt(
      () => server.createUser(token, username, password, admin),
      `Added ${username}. Give them their password to sign in.`,
    );
    if (added) {
      setUsername("");
      setPassword("");
      setAdmin(false);
    }
  }

  function resetPassword(user: ServerUser) {
    const password = window.prompt(`New password for ${user.username} (at least 8 characters)`);
    if (password) {
      attempt(() => server.resetPassword(token, user.id, password), `Changed ${user.username}'s password.`);
    }
  }

  function remove(user: ServerUser) {
    if (
      window.confirm(
        `Delete ${user.username}'s account? Everything they've synced is deleted from the server. Their devices keep their own copy.`,
      )
    ) {
      attempt(() => server.deleteUser(token, user.id), `Deleted ${user.username}'s account.`);
    }
  }

  return (
    <section className="card my-6 p-4">
      <h2 className="text-lg font-semibold">People on this server</h2>
      <ul className="mt-2 divide-y divide-line">
        {users.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              {user.username}
              {user.admin && <span className="ml-2 text-xs text-muted">admin</span>}
              {user.id === me && <span className="ml-2 text-xs text-muted">you</span>}
            </span>
            {user.id !== me && (
              <span className="flex gap-2">
                <button type="button" className="btn" onClick={() => resetPassword(user)}>
                  Reset password
                </button>
                <button type="button" className="btn text-danger" onClick={() => remove(user)}>
                  Delete
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      <form className="mt-3 flex flex-col gap-2 sm:max-w-sm" onSubmit={add}>
        <h3 className="section-title mb-0 mt-2">Add someone</h3>
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input
            className="input"
            autoComplete="off"
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
          Admin (can add and remove people)
        </label>
        <button type="submit" className="btn btn-primary self-start">
          Add
        </button>
      </form>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`mt-2 text-sm ${message.error ? "text-danger" : ""}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
