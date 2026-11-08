import { createContext, useContext } from "react";
import type { Session } from "./api";

export type SyncState = "off" | "syncing" | "synced" | "error";

type SyncContext = {
  session: Session | null;
  state: SyncState;
  error: string;
  lastSyncedAt: number | null;
  syncNow: () => void;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

export const Context = createContext<SyncContext>({
  session: null,
  state: "off",
  error: "",
  lastSyncedAt: null,
  syncNow: () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export const useSync = () => useContext(Context);
